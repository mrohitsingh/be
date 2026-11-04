import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AttendanceRecordStatus,
  AttendanceSessionStatus,
  EnrollmentStatus,
} from '../../common/constants/statuses.js';
import { GetAttendanceSheetDto } from './dto/get-attendance-sheet.dto.js';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceSheet(tenantId: number, query: GetAttendanceSheetDto) {
    const section = await this.prisma.section.findFirst({
      where: { id: query.section_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!section) {
      throw new NotFoundException({
        code: 'SECTION_NOT_FOUND',
        message: 'Section not found in this school tenant.',
      });
    }

    const sessionType = query.session_type ?? 'DAILY';
    const date = new Date(query.date);

    // Fetch existing session if already created
    const existingSession = await this.prisma.attendanceSession.findUnique({
      where: {
        tenant_id_section_id_attendance_date_session_type: {
          tenant_id: tenantId,
          section_id: query.section_id,
          attendance_date: date,
          session_type: sessionType,
        },
      },
      include: {
        records: {
          where: { tenant_id: tenantId, deleted_at: null },
        },
      },
    });

    // Fetch all active enrolled students in this section for this academic year
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        tenant_id: tenantId,
        section_id: query.section_id,
        academic_year_id: query.academic_year_id,
        status: EnrollmentStatus.CURRENT,
        deleted_at: null,
      },
      include: {
        student: {
          select: {
            id: true,
            admission_number: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: [{ roll_number: 'asc' }, { student: { first_name: 'asc' } }],
    });

    const recordMap = new Map(
      (existingSession?.records ?? []).map((r) => [r.enrollment_id, r]),
    );

    const sheetRows = enrollments.map((enr) => {
      const rec = recordMap.get(enr.id);
      return {
        enrollment_id: enr.id,
        student_id: enr.student.id,
        admission_number: enr.student.admission_number,
        student_name: `${enr.student.first_name} ${enr.student.last_name}`,
        roll_number: enr.roll_number,
        status: rec ? rec.status : AttendanceRecordStatus.PRESENT,
        remarks: rec ? rec.remarks : null,
      };
    });

    return {
      session: existingSession
        ? {
            id: existingSession.id,
            is_locked: existingSession.is_locked,
            status: existingSession.status,
            attendance_date: existingSession.attendance_date,
            session_type: existingSession.session_type,
          }
        : {
            id: null,
            is_locked: false,
            status: AttendanceSessionStatus.OPEN,
            attendance_date: date,
            session_type: sessionType,
          },
      students: sheetRows,
    };
  }

  async submitAttendance(
    tenantId: number,
    dto: SubmitAttendanceDto,
    userId?: number,
  ) {
    const attendanceDate = new Date(dto.attendance_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (attendanceDate.getTime() > today.getTime()) {
      throw new BadRequestException({
        code: 'FUTURE_DATE_NOT_ALLOWED',
        message: 'Cannot record attendance for a future date.',
      });
    }

    const section = await this.prisma.section.findFirst({
      where: { id: dto.section_id, tenant_id: tenantId, deleted_at: null },
    });
    if (!section) {
      throw new NotFoundException({
        code: 'SECTION_NOT_FOUND',
        message: 'Section not found in this school tenant.',
      });
    }

    const sessionType = dto.session_type ?? 'DAILY';

    return this.prisma.$transaction(async (tx) => {
      // Upsert the session record
      let session = await tx.attendanceSession.findUnique({
        where: {
          tenant_id_section_id_attendance_date_session_type: {
            tenant_id: tenantId,
            section_id: dto.section_id,
            attendance_date: attendanceDate,
            session_type: sessionType,
          },
        },
      });

      if (session?.is_locked) {
        throw new HttpException(
          {
            code: 'ATTENDANCE_SESSION_LOCKED',
            message:
              'Attendance session is locked. School Admin override required to modify.',
          },
          HttpStatus.LOCKED,
        );
      }

      if (!session) {
        session = await tx.attendanceSession.create({
          data: {
            tenant_id: tenantId,
            section_id: dto.section_id,
            academic_year_id: dto.academic_year_id,
            attendance_date: attendanceDate,
            session_type: sessionType,
            taken_by: userId,
            status: AttendanceSessionStatus.SUBMITTED,
          },
        });
      } else {
        session = await tx.attendanceSession.update({
          where: { id: session.id },
          data: {
            taken_by: userId,
            status: AttendanceSessionStatus.SUBMITTED,
          },
        });
      }

      // Upsert each record
      for (const entry of dto.entries) {
        // Verify enrollment belongs to tenant and this section
        const enrollment = await tx.studentEnrollment.findFirst({
          where: {
            id: entry.enrollment_id,
            tenant_id: tenantId,
            section_id: dto.section_id,
            deleted_at: null,
          },
        });

        if (!enrollment) {
          throw new NotFoundException({
            code: 'ENROLLMENT_NOT_FOUND',
            message: `Enrollment ${entry.enrollment_id} does not belong to section ${dto.section_id}.`,
          });
        }

        await tx.attendanceRecord.upsert({
          where: {
            tenant_id_session_id_enrollment_id: {
              tenant_id: tenantId,
              session_id: session.id,
              enrollment_id: entry.enrollment_id,
            },
          },
          update: {
            status: entry.status,
            remarks: entry.remarks,
          },
          create: {
            tenant_id: tenantId,
            session_id: session.id,
            enrollment_id: entry.enrollment_id,
            status: entry.status,
            remarks: entry.remarks,
          },
        });
      }

      return {
        session_id: session.id,
        records_saved: dto.entries.length,
        status: AttendanceSessionStatus.SUBMITTED,
      };
    });
  }

  async setSessionLock(
    tenantId: number,
    sessionId: number,
    isLocked: boolean,
  ) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, tenant_id: tenantId, deleted_at: null },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'ATTENDANCE_SESSION_NOT_FOUND',
        message: 'Attendance session not found in this school tenant.',
      });
    }

    return this.prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        is_locked: isLocked,
        status: isLocked
          ? AttendanceSessionStatus.LOCKED
          : AttendanceSessionStatus.REOPENED,
      },
    });
  }
}
