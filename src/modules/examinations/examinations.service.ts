import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ExamMarkStatus,
  ExamStatus,
  ReportCardStatus,
} from '../../common/constants/statuses.js';
import { CreateGradeScaleDto } from './dto/create-grade-scale.dto.js';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { CreateExamScheduleDto } from './dto/create-schedule.dto.js';
import { SubmitMarksDto } from './dto/submit-marks.dto.js';
import { CompileReportCardsDto } from './dto/compile-report-cards.dto.js';

@Injectable()
export class ExaminationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGradeScale(tenantId: number, dto: CreateGradeScaleDto) {
    return this.prisma.gradeScale.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        min_percentage: dto.min_percentage,
        max_percentage: dto.max_percentage,
        letter_grade: dto.letter_grade,
        grade_point: dto.grade_point,
      },
    });
  }

  async listGradeScales(tenantId: number) {
    return this.prisma.gradeScale.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { min_percentage: 'desc' },
    });
  }

  async createExam(tenantId: number, dto: CreateExamDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academic_year_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!year) {
      throw new NotFoundException({
        code: 'ACADEMIC_YEAR_NOT_FOUND',
        message: 'Academic year not found in this school tenant.',
      });
    }

    const existing = await this.prisma.exam.findUnique({
      where: {
        tenant_id_academic_year_id_name: {
          tenant_id: tenantId,
          academic_year_id: dto.academic_year_id,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'EXAM_NAME_EXISTS',
        message: `Exam with name '${dto.name}' already exists in this academic year.`,
      });
    }

    return this.prisma.exam.create({
      data: {
        tenant_id: tenantId,
        academic_year_id: dto.academic_year_id,
        name: dto.name,
        term: dto.term,
        status: ExamStatus.SCHEDULED,
      },
    });
  }

  async createSchedule(tenantId: number, dto: CreateExamScheduleDto) {
    const [exam, classEntity, subject] = await Promise.all([
      this.prisma.exam.findFirst({
        where: { id: dto.exam_id, tenant_id: tenantId, deleted_at: null },
      }),
      this.prisma.class.findFirst({
        where: { id: dto.class_id, tenant_id: tenantId, deleted_at: null },
      }),
      this.prisma.subject.findFirst({
        where: {
          id: dto.subject_id,
          class_id: dto.class_id,
          tenant_id: tenantId,
          deleted_at: null,
        },
      }),
    ]);

    if (!exam || !classEntity || !subject) {
      throw new NotFoundException({
        code: 'EXAM_SCHEDULE_RESOURCE_NOT_FOUND',
        message: 'Exam, class, or subject not found in this school tenant.',
      });
    }

    if (dto.pass_marks > dto.max_marks) {
      throw new BadRequestException({
        code: 'INVALID_PASS_MARKS',
        message: 'Passing marks cannot exceed maximum marks.',
      });
    }

    return this.prisma.examSchedule.create({
      data: {
        tenant_id: tenantId,
        exam_id: dto.exam_id,
        class_id: dto.class_id,
        subject_id: dto.subject_id,
        exam_date: new Date(dto.exam_date),
        max_marks: dto.max_marks,
        pass_marks: dto.pass_marks,
      },
    });
  }

  async submitMarks(tenantId: number, dto: SubmitMarksDto) {
    const schedule = await this.prisma.examSchedule.findFirst({
      where: { id: dto.schedule_id, tenant_id: tenantId, deleted_at: null },
      include: { exam: true },
    });

    if (!schedule) {
      throw new NotFoundException({
        code: 'EXAM_SCHEDULE_NOT_FOUND',
        message: 'Exam schedule not found in this school tenant.',
      });
    }

    if (schedule.exam.status === ExamStatus.PUBLISHED) {
      throw new HttpException(
        {
          code: 'EXAM_ALREADY_PUBLISHED',
          message: 'Cannot modify marks for an already published examination.',
        },
        HttpStatus.LOCKED,
      );
    }

    const maxMarks = Number(schedule.max_marks);

    // Validate marks values before saving
    for (const entry of dto.entries) {
      if (entry.marks_obtained !== undefined && entry.marks_obtained !== null) {
        if (entry.marks_obtained < 0) {
          throw new UnprocessableEntityException({
            code: 'NEGATIVE_MARKS_NOT_ALLOWED',
            message: 'Marks obtained cannot be negative.',
          });
        }
        if (entry.marks_obtained > maxMarks) {
          throw new UnprocessableEntityException({
            code: 'MARKS_EXCEED_MAXIMUM',
            message: `Marks obtained (${entry.marks_obtained}) exceeds subject maximum (${maxMarks}).`,
          });
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const savedMarks = [];

      for (const entry of dto.entries) {
        const mark = await tx.examMark.upsert({
          where: {
            tenant_id_schedule_id_enrollment_id: {
              tenant_id: tenantId,
              schedule_id: dto.schedule_id,
              enrollment_id: entry.enrollment_id,
            },
          },
          update: {
            marks_obtained: entry.marks_obtained,
            is_absent: entry.is_absent ?? false,
            is_exempt: entry.is_exempt ?? false,
            status: ExamMarkStatus.SUBMITTED,
          },
          create: {
            tenant_id: tenantId,
            schedule_id: dto.schedule_id,
            enrollment_id: entry.enrollment_id,
            marks_obtained: entry.marks_obtained,
            is_absent: entry.is_absent ?? false,
            is_exempt: entry.is_exempt ?? false,
            status: ExamMarkStatus.SUBMITTED,
          },
        });
        savedMarks.push(mark);
      }

      return {
        schedule_id: dto.schedule_id,
        saved_count: savedMarks.length,
      };
    });
  }

  async compileReportCards(tenantId: number, dto: CompileReportCardsDto) {
    const schedules = await this.prisma.examSchedule.findMany({
      where: {
        exam_id: dto.exam_id,
        class_id: dto.class_id,
        tenant_id: tenantId,
        deleted_at: null,
      },
      include: {
        marks: {
          where: { tenant_id: tenantId, deleted_at: null },
        },
      },
    });

    if (schedules.length === 0) {
      throw new NotFoundException({
        code: 'NO_EXAM_SCHEDULES_FOUND',
        message: 'No exam schedules found for this exam and class.',
      });
    }

    const gradeScales = await this.prisma.gradeScale.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { min_percentage: 'desc' },
    });

    // Group marks by student enrollment
    const studentMarksMap = new Map<number, { total: number; max: number }>();

    for (const schedule of schedules) {
      const scheduleMax = Number(schedule.max_marks);
      for (const mark of schedule.marks) {
        const current = studentMarksMap.get(mark.enrollment_id) ?? { total: 0, max: 0 };
        const obtained = mark.is_absent || mark.is_exempt ? 0 : Number(mark.marks_obtained ?? 0);
        studentMarksMap.set(mark.enrollment_id, {
          total: current.total + obtained,
          max: current.max + scheduleMax,
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const reportCards = [];

      for (const [enrollmentId, score] of studentMarksMap.entries()) {
        const percentage = score.max > 0 ? (score.total / score.max) * 100 : 0;
        const roundedPercentage = Math.round(percentage * 100) / 100;

        // Match against grade scale
        let letterGrade = 'N/A';
        let gpa = 0.0;
        for (const scale of gradeScales) {
          if (
            roundedPercentage >= Number(scale.min_percentage) &&
            roundedPercentage <= Number(scale.max_percentage)
          ) {
            letterGrade = scale.letter_grade;
            gpa = Number(scale.grade_point);
            break;
          }
        }

        const reportCard = await tx.reportCard.upsert({
          where: {
            tenant_id_exam_id_enrollment_id: {
              tenant_id: tenantId,
              exam_id: dto.exam_id,
              enrollment_id: enrollmentId,
            },
          },
          update: {
            total_marks: score.total,
            max_possible_marks: score.max,
            percentage: roundedPercentage,
            gpa,
            letter_grade: letterGrade,
            status: ReportCardStatus.COMPILED,
          },
          create: {
            tenant_id: tenantId,
            exam_id: dto.exam_id,
            enrollment_id: enrollmentId,
            total_marks: score.total,
            max_possible_marks: score.max,
            percentage: roundedPercentage,
            gpa,
            letter_grade: letterGrade,
            status: ReportCardStatus.COMPILED,
          },
        });

        reportCards.push(reportCard);
      }

      return {
        exam_id: dto.exam_id,
        class_id: dto.class_id,
        compiled_count: reportCards.length,
        report_cards: reportCards,
      };
    });
  }

  async publishExam(tenantId: number, examId: number) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenant_id: tenantId, deleted_at: null },
    });

    if (!exam) {
      throw new NotFoundException({
        code: 'EXAM_NOT_FOUND',
        message: 'Exam not found in this school tenant.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedExam = await tx.exam.update({
        where: { id: examId },
        data: { status: ExamStatus.PUBLISHED },
      });

      await tx.reportCard.updateMany({
        where: { exam_id: examId, tenant_id: tenantId },
        data: { status: ReportCardStatus.PUBLISHED },
      });

      return updatedExam;
    });
  }

  async getReportCard(tenantId: number, examId: number, enrollmentId: number) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: {
        tenant_id_exam_id_enrollment_id: {
          tenant_id: tenantId,
          exam_id: examId,
          enrollment_id: enrollmentId,
        },
      },
      include: {
        exam: { select: { id: true, name: true, term: true, status: true } },
        enrollment: {
          include: {
            student: { select: { id: true, admission_number: true, first_name: true, last_name: true } },
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!reportCard) {
      throw new NotFoundException({
        code: 'REPORT_CARD_NOT_FOUND',
        message: 'Report card not found for this exam and student enrollment.',
      });
    }

    return reportCard;
  }
}
