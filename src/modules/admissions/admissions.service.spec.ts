import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AdmissionsService } from './admissions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdmissionStatus, EnrollmentStatus } from '../../common/constants/statuses.js';

describe('AdmissionsService', () => {
  let service: AdmissionsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      class: { findFirst: vi.fn() },
      academicYear: { findFirst: vi.fn() },
      section: { findFirst: vi.fn() },
      student: { findUnique: vi.fn(), create: vi.fn() },
      studentEnrollment: { count: vi.fn(), create: vi.fn() },
      guardian: { findFirst: vi.fn(), create: vi.fn() },
      studentGuardian: { create: vi.fn() },
      admissionApplication: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };
    service = new AdmissionsService(prismaMock as unknown as PrismaService);
  });

  describe('createApplication', () => {
    it('should create an application strictly scoped to tenant', async () => {
      prismaMock.class.findFirst.mockResolvedValue({ id: 1, tenant_id: 5 });
      prismaMock.admissionApplication.findUnique.mockResolvedValue(null);
      prismaMock.admissionApplication.create.mockImplementation(({ data }: any) => ({
        id: 10,
        ...data,
      }));

      const res = await service.createApplication(5, {
        application_number: 'APP-2026-001',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '2015-05-10',
        gender: 'MALE',
        applied_class_id: 1,
        parent_name: 'Jane Doe',
        parent_email: 'jane@example.com',
      });

      expect(res.tenant_id).toBe(5);
      expect(res.status).toBe(AdmissionStatus.SUBMITTED);
    });
  });

  describe('finalizeAdmission', () => {
    const validDto = {
      academic_year_id: 1,
      section_id: 2,
      admission_number: 'ADM-2026-042',
      roll_number: 1,
    };

    it('should enforce section capacity limit and throw UnprocessableEntityException', async () => {
      prismaMock.admissionApplication.findFirst.mockResolvedValue({
        id: 10,
        tenant_id: 5,
        applied_class_id: 1,
        status: AdmissionStatus.OFFERED,
      });
      prismaMock.academicYear.findFirst.mockResolvedValue({ id: 1, tenant_id: 5 });
      prismaMock.section.findFirst.mockResolvedValue({
        id: 2,
        class_id: 1,
        tenant_id: 5,
        capacity: 30,
      });
      // Existing count equals or exceeds capacity
      prismaMock.studentEnrollment.count.mockResolvedValue(30);

      await expect(service.finalizeAdmission(5, 10, validDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should reject if admission_number already exists in this tenant', async () => {
      prismaMock.admissionApplication.findFirst.mockResolvedValue({
        id: 10,
        tenant_id: 5,
        applied_class_id: 1,
        status: AdmissionStatus.OFFERED,
      });
      prismaMock.academicYear.findFirst.mockResolvedValue({ id: 1, tenant_id: 5 });
      prismaMock.section.findFirst.mockResolvedValue({
        id: 2,
        class_id: 1,
        tenant_id: 5,
        capacity: 30,
      });
      prismaMock.studentEnrollment.count.mockResolvedValue(15);
      prismaMock.student.findUnique.mockResolvedValue({ id: 99, admission_number: 'ADM-2026-042' });

      await expect(service.finalizeAdmission(5, 10, validDto)).rejects.toThrow(ConflictException);
    });

    it('should atomically create student, enrollment, and mark application ENROLLED', async () => {
      prismaMock.admissionApplication.findFirst.mockResolvedValue({
        id: 10,
        tenant_id: 5,
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: new Date('2015-05-10'),
        gender: 'MALE',
        applied_class_id: 1,
        parent_name: 'Jane Doe',
        parent_email: 'jane@example.com',
        status: AdmissionStatus.OFFERED,
      });
      prismaMock.academicYear.findFirst.mockResolvedValue({ id: 1, tenant_id: 5 });
      prismaMock.section.findFirst.mockResolvedValue({
        id: 2,
        class_id: 1,
        tenant_id: 5,
        capacity: 30,
      });
      prismaMock.studentEnrollment.count.mockResolvedValue(10);
      prismaMock.student.findUnique.mockResolvedValue(null);

      prismaMock.student.create.mockResolvedValue({
        id: 100,
        tenant_id: 5,
        admission_number: 'ADM-2026-042',
      });
      prismaMock.studentEnrollment.create.mockResolvedValue({
        id: 200,
        tenant_id: 5,
        student_id: 100,
        status: EnrollmentStatus.CURRENT,
      });
      prismaMock.guardian.findFirst.mockResolvedValue(null);
      prismaMock.guardian.create.mockResolvedValue({ id: 300, tenant_id: 5, email: 'jane@example.com' });
      prismaMock.admissionApplication.update.mockResolvedValue({});

      const result = await service.finalizeAdmission(5, 10, validDto);

      expect(result.student.id).toBe(100);
      expect(result.enrollment.id).toBe(200);
      expect(prismaMock.admissionApplication.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          status: AdmissionStatus.ENROLLED,
          enrolled_student_id: 100,
        },
      });
    });
  });
});
