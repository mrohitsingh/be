import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EnrollmentStatus } from '../../common/constants/statuses.js';
import { QueryStudentsDto } from './dto/query-students.dto.js';
import { PromoteStudentsDto } from './dto/promote-students.dto.js';
import { LinkGuardianDto } from './dto/link-guardian.dto.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudents(tenantId: number, query: QueryStudentsDto) {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      deleted_at: null,
    };

    if (query.search) {
      where.OR = [
        { first_name: { contains: query.search, mode: 'insensitive' } },
        { last_name: { contains: query.search, mode: 'insensitive' } },
        { admission_number: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.academic_year_id || query.class_id || query.section_id) {
      where.enrollments = {
        some: {
          tenant_id: tenantId,
          deleted_at: null,
          ...(query.academic_year_id ? { academic_year_id: query.academic_year_id } : {}),
          ...(query.class_id ? { class_id: query.class_id } : {}),
          ...(query.section_id ? { section_id: query.section_id } : {}),
        },
      };
    }

    return this.prisma.student.findMany({
      where,
      include: {
        enrollments: {
          where: { tenant_id: tenantId, deleted_at: null },
          include: {
            class: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
            academic_year: { select: { id: true, name: true, is_current: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        guardians: {
          include: {
            guardian: {
              select: { id: true, first_name: true, last_name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStudent(tenantId: number, id: number) {
    const student = await this.prisma.student.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: {
        enrollments: {
          where: { tenant_id: tenantId, deleted_at: null },
          include: {
            class: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
            academic_year: { select: { id: true, name: true, start_date: true, end_date: true } },
          },
          orderBy: { created_at: 'asc' },
        },
        guardians: {
          include: {
            guardian: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException({
        code: 'STUDENT_NOT_FOUND',
        message: 'Student not found in this school tenant.',
      });
    }

    return student;
  }

  async promoteStudents(tenantId: number, dto: PromoteStudentsDto) {
    if (dto.source_academic_year_id === dto.target_academic_year_id) {
      throw new BadRequestException({
        code: 'INVALID_PROMOTION_YEARS',
        message: 'Source and target academic years must be distinct.',
      });
    }

    const [sourceYear, targetYear] = await Promise.all([
      this.prisma.academicYear.findFirst({
        where: { id: dto.source_academic_year_id, tenant_id: tenantId, deleted_at: null },
      }),
      this.prisma.academicYear.findFirst({
        where: { id: dto.target_academic_year_id, tenant_id: tenantId, deleted_at: null },
      }),
    ]);

    if (!sourceYear || !targetYear) {
      throw new NotFoundException({
        code: 'ACADEMIC_YEAR_NOT_FOUND',
        message: 'Source or target academic year not found in this school.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of dto.promotions) {
        const student = await tx.student.findFirst({
          where: { id: item.student_id, tenant_id: tenantId, deleted_at: null },
        });

        if (!student) {
          throw new NotFoundException({
            code: 'STUDENT_NOT_FOUND',
            message: `Student with ID ${item.student_id} not found.`,
          });
        }

        // Validate target class and section
        const targetSection = await tx.section.findFirst({
          where: {
            id: item.target_section_id,
            class_id: item.target_class_id,
            tenant_id: tenantId,
            deleted_at: null,
          },
        });

        if (!targetSection) {
          throw new NotFoundException({
            code: 'TARGET_SECTION_NOT_FOUND',
            message: `Target section ${item.target_section_id} in class ${item.target_class_id} not found.`,
          });
        }

        // Check if student already enrolled in target year
        const existingTargetEnrollment = await tx.studentEnrollment.findUnique({
          where: {
            tenant_id_academic_year_id_student_id: {
              tenant_id: tenantId,
              academic_year_id: dto.target_academic_year_id,
              student_id: item.student_id,
            },
          },
        });

        if (existingTargetEnrollment) {
          throw new ConflictException({
            code: 'STUDENT_ALREADY_ENROLLED_IN_TARGET_YEAR',
            message: `Student ${item.student_id} already has an enrollment in the target academic year.`,
          });
        }

        // Mark previous enrollment as COMPLETED or RETAINED to preserve historical record
        await tx.studentEnrollment.updateMany({
          where: {
            tenant_id: tenantId,
            student_id: item.student_id,
            academic_year_id: dto.source_academic_year_id,
          },
          data: {
            status: item.is_retained ? EnrollmentStatus.RETAINED : EnrollmentStatus.COMPLETED,
            end_date: new Date(),
          },
        });

        // Create new enrollment record for target academic year
        const newEnrollment = await tx.studentEnrollment.create({
          data: {
            tenant_id: tenantId,
            student_id: item.student_id,
            academic_year_id: dto.target_academic_year_id,
            class_id: item.target_class_id,
            section_id: item.target_section_id,
            roll_number: item.roll_number,
            status: EnrollmentStatus.CURRENT,
            start_date: new Date(),
          },
        });

        results.push(newEnrollment);
      }

      return {
        promoted_count: results.length,
        enrollments: results,
      };
    });
  }

  async linkGuardian(tenantId: number, studentId: number, dto: LinkGuardianDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenant_id: tenantId, deleted_at: null },
    });
    if (!student) {
      throw new NotFoundException({
        code: 'STUDENT_NOT_FOUND',
        message: 'Student not found in this school tenant.',
      });
    }

    const guardian = await this.prisma.guardian.findFirst({
      where: { id: dto.guardian_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!guardian) {
      throw new NotFoundException({
        code: 'GUARDIAN_NOT_FOUND',
        message: 'Guardian not found in this school tenant.',
      });
    }

    if (dto.is_primary) {
      await this.prisma.studentGuardian.updateMany({
        where: { tenant_id: tenantId, student_id: studentId },
        data: { is_primary: false },
      });
    }

    return this.prisma.studentGuardian.upsert({
      where: {
        tenant_id_student_id_guardian_id: {
          tenant_id: tenantId,
          student_id: studentId,
          guardian_id: dto.guardian_id,
        },
      },
      update: {
        relationship_type: dto.relationship_type,
        is_primary: dto.is_primary ?? false,
      },
      create: {
        tenant_id: tenantId,
        student_id: studentId,
        guardian_id: dto.guardian_id,
        relationship_type: dto.relationship_type,
        is_primary: dto.is_primary ?? false,
      },
    });
  }
}
