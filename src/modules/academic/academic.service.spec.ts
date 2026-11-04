import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicService } from './academic.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AcademicService', () => {
  let service: AcademicService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      academicYear: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      class: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      section: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      subject: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new AcademicService(prismaMock as unknown as PrismaService);
  });

  describe('createAcademicYear', () => {
    it('should create an academic year scoped to tenant', async () => {
      prismaMock.academicYear.findUnique.mockResolvedValue(null);
      prismaMock.academicYear.create.mockImplementation(({ data }: any) => ({
        id: 1,
        ...data,
      }));

      const res = await service.createAcademicYear(10, {
        name: '2026-2027',
        start_date: '2026-06-01',
        end_date: '2027-04-30',
        is_current: true,
      });

      expect(res.tenant_id).toBe(10);
      expect(res.name).toBe('2026-2027');
      expect(prismaMock.academicYear.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: 10, is_current: true },
        data: { is_current: false },
      });
    });

    it('should reject duplicate academic year name within same tenant', async () => {
      prismaMock.academicYear.findUnique.mockResolvedValue({ id: 1, name: '2026-2027' });

      await expect(
        service.createAcademicYear(10, {
          name: '2026-2027',
          start_date: '2026-06-01',
          end_date: '2027-04-30',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createSection (Tenant Isolation)', () => {
    it('should reject section creation if class belongs to another tenant', async () => {
      prismaMock.class.findFirst.mockResolvedValue(null); // Not found in tenant 10

      await expect(
        service.createSection(10, {
          class_id: 99, // belongs to tenant 20
          name: 'Section A',
          code: 'A',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create section when class belongs to authenticated tenant', async () => {
      prismaMock.class.findFirst.mockResolvedValue({ id: 5, tenant_id: 10, name: 'Grade 5' });
      prismaMock.section.findUnique.mockResolvedValue(null);
      prismaMock.section.create.mockImplementation(({ data }: any) => ({
        id: 101,
        ...data,
      }));

      const res = await service.createSection(10, {
        class_id: 5,
        name: 'Section A',
        code: 'A',
        capacity: 35,
      });

      expect(res.tenant_id).toBe(10);
      expect(res.capacity).toBe(35);
    });
  });
});
