import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdmissionStatus, EnrollmentStatus } from '../../common/constants/statuses.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { FinalizeAdmissionDto } from './dto/finalize-admission.dto.js';

@Injectable()
export class AdmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createApplication(tenantId: number, dto: CreateApplicationDto) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.applied_class_id, tenant_id: tenantId, deleted_at: null },
    });

    if (!classEntity) {
      throw new NotFoundException({
        code: 'CLASS_NOT_FOUND',
        message: 'Applied class does not exist in this school tenant.',
      });
    }

    const existing = await this.prisma.admissionApplication.findUnique({
      where: {
        tenant_id_application_number: {
          tenant_id: tenantId,
          application_number: dto.application_number,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'APPLICATION_NUMBER_EXISTS',
        message: `Application number '${dto.application_number}' already exists in this school.`,
      });
    }

    return this.prisma.admissionApplication.create({
      data: {
        tenant_id: tenantId,
        application_number: dto.application_number,
        first_name: dto.first_name,
        last_name: dto.last_name,
        date_of_birth: new Date(dto.date_of_birth),
        gender: dto.gender,
        applied_class_id: dto.applied_class_id,
        parent_name: dto.parent_name,
        parent_email: dto.parent_email,
        parent_phone: dto.parent_phone,
        status: AdmissionStatus.SUBMITTED,
      },
    });
  }

  async listApplications(tenantId: number, status?: number) {
    return this.prisma.admissionApplication.findMany({
      where: {
        tenant_id: tenantId,
        ...(status ? { status } : {}),
        deleted_at: null,
      },
      include: {
        applied_class: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateStatus(tenantId: number, id: number, status: number) {
    const app = await this.prisma.admissionApplication.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });

    if (!app) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Admission application not found.',
      });
    }

    if (app.status === AdmissionStatus.ENROLLED) {
      throw new BadRequestException({
        code: 'APPLICATION_ALREADY_ENROLLED',
        message: 'Cannot modify status of an already enrolled applicant.',
      });
    }

    return this.prisma.admissionApplication.update({
      where: { id },
      data: { status },
    });
  }

  async finalizeAdmission(
    tenantId: number,
    id: number,
    dto: FinalizeAdmissionDto,
  ) {
    const app = await this.prisma.admissionApplication.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });

    if (!app) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Admission application not found.',
      });
    }

    if (app.status === AdmissionStatus.ENROLLED) {
      throw new ConflictException({
        code: 'ALREADY_ENROLLED',
        message: 'Application has already been enrolled into a class.',
      });
    }

    // Verify academic year
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academic_year_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!year) {
      throw new NotFoundException({
        code: 'ACADEMIC_YEAR_NOT_FOUND',
        message: 'Academic year not found in this school tenant.',
      });
    }

    // Verify section and check capacity
    const section = await this.prisma.section.findFirst({
      where: {
        id: dto.section_id,
        tenant_id: tenantId,
        class_id: app.applied_class_id,
        deleted_at: null,
      },
    });

    if (!section) {
      throw new NotFoundException({
        code: 'SECTION_NOT_FOUND',
        message:
          'Section not found for the applied class in this school tenant.',
      });
    }

    const currentEnrollmentCount = await this.prisma.studentEnrollment.count({
      where: {
        tenant_id: tenantId,
        academic_year_id: dto.academic_year_id,
        section_id: dto.section_id,
        status: EnrollmentStatus.CURRENT,
        deleted_at: null,
      },
    });

    if (currentEnrollmentCount >= section.capacity) {
      throw new UnprocessableEntityException({
        code: 'SECTION_CAPACITY_REACHED',
        message: `Section has reached its maximum seat capacity of ${section.capacity}.`,
      });
    }

    // Verify admission number uniqueness
    const existingStudent = await this.prisma.student.findUnique({
      where: {
        tenant_id_admission_number: {
          tenant_id: tenantId,
          admission_number: dto.admission_number,
        },
      },
    });

    if (existingStudent) {
      throw new ConflictException({
        code: 'ADMISSION_NUMBER_EXISTS',
        message: `Admission number '${dto.admission_number}' is already assigned in this school.`,
      });
    }

    // Atomic transaction for student creation, enrollment, guardian linking, and status update
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          tenant_id: tenantId,
          admission_number: dto.admission_number,
          first_name: app.first_name,
          last_name: app.last_name,
          date_of_birth: app.date_of_birth,
          gender: app.gender,
        },
      });

      const enrollment = await tx.studentEnrollment.create({
        data: {
          tenant_id: tenantId,
          student_id: student.id,
          academic_year_id: dto.academic_year_id,
          class_id: app.applied_class_id,
          section_id: dto.section_id,
          roll_number: dto.roll_number,
          status: EnrollmentStatus.CURRENT,
        },
      });

      // Find or create guardian
      let guardian = await tx.guardian.findFirst({
        where: { tenant_id: tenantId, email: app.parent_email },
      });

      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            tenant_id: tenantId,
            first_name: app.parent_name,
            last_name: '',
            email: app.parent_email,
            phone: app.parent_phone,
          },
        });
      }

      await tx.studentGuardian.create({
        data: {
          tenant_id: tenantId,
          student_id: student.id,
          guardian_id: guardian.id,
          relationship_type: 'PRIMARY_GUARDIAN',
          is_primary: true,
        },
      });

      await tx.admissionApplication.update({
        where: { id: app.id },
        data: {
          status: AdmissionStatus.ENROLLED,
          enrolled_student_id: student.id,
        },
      });

      return {
        student,
        enrollment,
        guardian,
      };
    });
  }
}
