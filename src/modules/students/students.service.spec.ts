import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EnrollmentStatus } from '../../common/constants/statuses.js';

describe('StudentsService', () => {
  let service: StudentsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      academicYear: { findFirst: vi.fn() },
      student: { findMany: vi.fn(), findFirst: vi.fn() },
      section: { findFirst: vi.fn() },
      studentEnrollment: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      guardian: { findFirst: vi.fn() },
      studentGuardian: { updateMany: vi.fn(), upsert: vi.fn() },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };
    service = new StudentsService(prismaMock as unknown as PrismaService);
  });

  describe('promoteStudents (History Preservation)', () => {
    it('should preserve past academic history by updating source status to COMPLETED and creating new CURRENT record', async () => {
      prismaMock.academicYear.findFirst
        .mockResolvedValueOnce({ id: 1, tenant_id: 10, name: '2025-2026' })
        .mockResolvedValueOnce({ id: 2, tenant_id: 10, name: '2026-2027' });

      prismaMock.student.findFirst.mockResolvedValue({ id: 50, tenant_id: 10 });
      prismaMock.section.findFirst.mockResolvedValue({ id: 8, class_id: 4, tenant_id: 10 });
      prismaMock.studentEnrollment.findUnique.mockResolvedValue(null); // not yet enrolled in year 2

      prismaMock.studentEnrollment.create.mockImplementation(({ data }: any) => ({
        id: 999,
        ...data,
      }));

      const res = await service.promoteStudents(10, {
        source_academic_year_id: 1,
        target_academic_year_id: 2,
        promotions: [
          {
            student_id: 50,
            target_class_id: 4,
            target_section_id: 8,
            roll_number: 12,
          },
        ],
      });

      expect(res.promoted_count).toBe(1);
      // History preserved: past enrollment marked COMPLETED, never overwritten
      expect(prismaMock.studentEnrollment.updateMany).toHaveBeenCalledWith({
        where: {
          tenant_id: 10,
          student_id: 50,
          academic_year_id: 1,
        },
        data: {
          status: EnrollmentStatus.COMPLETED,
          end_date: expect.any(Date),
        },
      });

      // New enrollment row created
      expect(prismaMock.studentEnrollment.create).toHaveBeenCalledWith({
        data: {
          tenant_id: 10,
          student_id: 50,
          academic_year_id: 2,
          class_id: 4,
          section_id: 8,
          roll_number: 12,
          status: EnrollmentStatus.CURRENT,
          start_date: expect.any(Date),
        },
      });
    });

    it('should reject duplicate promotion into the target year', async () => {
      prismaMock.academicYear.findFirst
        .mockResolvedValueOnce({ id: 1, tenant_id: 10 })
        .mockResolvedValueOnce({ id: 2, tenant_id: 10 });

      prismaMock.student.findFirst.mockResolvedValue({ id: 50, tenant_id: 10 });
      prismaMock.section.findFirst.mockResolvedValue({ id: 8, class_id: 4, tenant_id: 10 });
      // Already enrolled in target year
      prismaMock.studentEnrollment.findUnique.mockResolvedValue({ id: 888, academic_year_id: 2 });

      await expect(
        service.promoteStudents(10, {
          source_academic_year_id: 1,
          target_academic_year_id: 2,
          promotions: [
            {
              student_id: 50,
              target_class_id: 4,
              target_section_id: 8,
            },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
