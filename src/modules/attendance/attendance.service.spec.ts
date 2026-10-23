import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, HttpException } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AttendanceRecordStatus } from '../../common/constants/statuses.js';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      section: { findFirst: vi.fn() },
      attendanceSession: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      studentEnrollment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      attendanceRecord: {
        upsert: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };
    service = new AttendanceService(prismaMock as unknown as PrismaService);
  });

  describe('getAttendanceSheet', () => {
    it('should default all enrolled students to PRESENT when session has no records yet', async () => {
      prismaMock.section.findFirst.mockResolvedValue({ id: 5, tenant_id: 1 });
      prismaMock.attendanceSession.findUnique.mockResolvedValue(null);
      prismaMock.studentEnrollment.findMany.mockResolvedValue([
        {
          id: 101,
          roll_number: 1,
          student: { id: 11, admission_number: 'ADM-01', first_name: 'Alice', last_name: 'Smith' },
        },
        {
          id: 102,
          roll_number: 2,
          student: { id: 12, admission_number: 'ADM-02', first_name: 'Bob', last_name: 'Jones' },
        },
      ]);

      const res = await service.getAttendanceSheet(1, {
        section_id: 5,
        academic_year_id: 2,
        date: '2026-10-15',
      });

      expect(res.students).toHaveLength(2);
      expect(res.students[0].status).toBe(AttendanceRecordStatus.PRESENT);
      expect(res.students[1].status).toBe(AttendanceRecordStatus.PRESENT);
      expect(res.session.is_locked).toBe(false);
    });
  });

  describe('submitAttendance', () => {
    it('should reject attendance for a future date', async () => {
      await expect(
        service.submitAttendance(1, {
          section_id: 5,
          academic_year_id: 2,
          attendance_date: '2030-01-01',
          entries: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if session is locked', async () => {
      prismaMock.section.findFirst.mockResolvedValue({ id: 5, tenant_id: 1 });
      prismaMock.attendanceSession.findUnique.mockResolvedValue({
        id: 77,
        is_locked: true,
      });

      await expect(
        service.submitAttendance(1, {
          section_id: 5,
          academic_year_id: 2,
          attendance_date: '2026-10-10',
          entries: [{ enrollment_id: 101, status: AttendanceRecordStatus.PRESENT }],
        }),
      ).rejects.toThrow(HttpException);
    });
  });
});
