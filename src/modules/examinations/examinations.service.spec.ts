import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException, UnprocessableEntityException } from '@nestjs/common';
import { ExaminationsService } from './examinations.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ExamStatus } from '../../common/constants/statuses.js';

describe('ExaminationsService', () => {
  let service: ExaminationsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      academicYear: { findFirst: vi.fn() },
      gradeScale: { create: vi.fn(), findMany: vi.fn() },
      exam: { findUnique: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      class: { findFirst: vi.fn() },
      subject: { findFirst: vi.fn() },
      examSchedule: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
      examMark: { upsert: vi.fn() },
      reportCard: { upsert: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };
    service = new ExaminationsService(prismaMock as unknown as PrismaService);
  });

  describe('submitMarks', () => {
    it('should reject marks obtained exceeding maximum marks', async () => {
      prismaMock.examSchedule.findFirst.mockResolvedValue({
        id: 10,
        tenant_id: 1,
        max_marks: 100,
        exam: { status: ExamStatus.EVALUATION },
      });

      await expect(
        service.submitMarks(1, {
          schedule_id: 10,
          entries: [
            {
              enrollment_id: 201,
              marks_obtained: 105, // Exceeds max 100
            },
          ],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject negative marks obtained', async () => {
      prismaMock.examSchedule.findFirst.mockResolvedValue({
        id: 10,
        tenant_id: 1,
        max_marks: 100,
        exam: { status: ExamStatus.EVALUATION },
      });

      await expect(
        service.submitMarks(1, {
          schedule_id: 10,
          entries: [
            {
              enrollment_id: 201,
              marks_obtained: -5,
            },
          ],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject submitting marks when exam is already PUBLISHED', async () => {
      prismaMock.examSchedule.findFirst.mockResolvedValue({
        id: 10,
        tenant_id: 1,
        max_marks: 100,
        exam: { status: ExamStatus.PUBLISHED },
      });

      await expect(
        service.submitMarks(1, {
          schedule_id: 10,
          entries: [
            {
              enrollment_id: 201,
              marks_obtained: 85,
            },
          ],
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('compileReportCards', () => {
    it('should compile marks, compute percentage, and assign matching grade scale', async () => {
      prismaMock.examSchedule.findMany.mockResolvedValue([
        {
          id: 1,
          max_marks: 100,
          marks: [{ enrollment_id: 201, marks_obtained: 85, is_absent: false, is_exempt: false }],
        },
        {
          id: 2,
          max_marks: 100,
          marks: [{ enrollment_id: 201, marks_obtained: 95, is_absent: false, is_exempt: false }],
        },
      ]);

      prismaMock.gradeScale.findMany.mockResolvedValue([
        { min_percentage: 90, max_percentage: 100, letter_grade: 'A+', grade_point: 4.0 },
        { min_percentage: 80, max_percentage: 89.99, letter_grade: 'A', grade_point: 3.7 },
      ]);

      prismaMock.reportCard.upsert.mockImplementation(({ create }: any) => create);

      const res = await service.compileReportCards(1, {
        exam_id: 5,
        class_id: 3,
      });

      expect(res.compiled_count).toBe(1);
      expect(prismaMock.reportCard.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            total_marks: 180,
            max_possible_marks: 200,
            percentage: 90,
            letter_grade: 'A+',
            gpa: 4.0,
          }),
        }),
      );
    });
  });
});
