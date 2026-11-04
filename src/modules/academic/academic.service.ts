import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  async createAcademicYear(tenantId: number, dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findUnique({
      where: {
        tenant_id_name: {
          tenant_id: tenantId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ACADEMIC_YEAR_NAME_EXISTS',
        message: `Academic year with name '${dto.name}' already exists in this school.`,
      });
    }

    if (dto.is_current) {
      await this.prisma.academicYear.updateMany({
        where: { tenant_id: tenantId, is_current: true },
        data: { is_current: false },
      });
    }

    return this.prisma.academicYear.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        is_current: dto.is_current ?? false,
      },
    });
  }

  async listAcademicYears(tenantId: number) {
    return this.prisma.academicYear.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { start_date: 'desc' },
    });
  }

  async createClass(tenantId: number, dto: CreateClassDto) {
    const existing = await this.prisma.class.findUnique({
      where: {
        tenant_id_code: {
          tenant_id: tenantId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'CLASS_CODE_EXISTS',
        message: `Class code '${dto.code}' already exists in this school.`,
      });
    }

    return this.prisma.class.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async listClasses(tenantId: number) {
    return this.prisma.class.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: {
        sections: {
          where: { deleted_at: null },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSection(tenantId: number, dto: CreateSectionDto) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.class_id, tenant_id: tenantId, deleted_at: null },
    });

    if (!classEntity) {
      throw new NotFoundException({
        code: 'CLASS_NOT_FOUND',
        message: 'Class not found in this school tenant.',
      });
    }

    const existing = await this.prisma.section.findUnique({
      where: {
        tenant_id_class_id_code: {
          tenant_id: tenantId,
          class_id: dto.class_id,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'SECTION_CODE_EXISTS',
        message: `Section with code '${dto.code}' already exists in this class.`,
      });
    }

    return this.prisma.section.create({
      data: {
        tenant_id: tenantId,
        class_id: dto.class_id,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity ?? 40,
      },
    });
  }

  async createSubject(tenantId: number, dto: CreateSubjectDto) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.class_id, tenant_id: tenantId, deleted_at: null },
    });

    if (!classEntity) {
      throw new NotFoundException({
        code: 'CLASS_NOT_FOUND',
        message: 'Class not found in this school tenant.',
      });
    }

    const existing = await this.prisma.subject.findUnique({
      where: {
        tenant_id_class_id_code: {
          tenant_id: tenantId,
          class_id: dto.class_id,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'SUBJECT_CODE_EXISTS',
        message: `Subject with code '${dto.code}' already exists in this class.`,
      });
    }

    return this.prisma.subject.create({
      data: {
        tenant_id: tenantId,
        class_id: dto.class_id,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async listSubjects(tenantId: number, classId?: number) {
    return this.prisma.subject.findMany({
      where: {
        tenant_id: tenantId,
        ...(classId ? { class_id: classId } : {}),
        deleted_at: null,
      },
      orderBy: { name: 'asc' },
    });
  }
}
