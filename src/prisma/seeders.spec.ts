import { describe, expect, it, vi } from 'vitest';
import {
  seedRoles,
  seedActions,
  seedModules,
  seedTenants,
  seedAcademics,
  seedSuperAdmin,
  seedSchoolAdmin,
  seedTeachers,
  seedStudents,
  seedParents,
} from '../../prisma/seeders/index.js';

describe('Modular Database Seeders', () => {
  const createMockPrisma = () => {
    return {
      role: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 10, ...create })),
        findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: 10, code: where.code })),
      },
      permission: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 20, ...create })),
      },
      applicationModuleAction: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 30, ...create })),
      },
      module: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 40, ...create })),
      },
      tenant: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      },
      academicYear: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 100, ...create })),
      },
      class: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 200, ...create })),
      },
      section: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 300, ...create })),
      },
      subject: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 400, ...create })),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 50, ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 50, ...data })),
      },
      userAccess: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 60, ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 60, ...data })),
      },
      teacher: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 70, ...create })),
      },
      teacherAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 80, ...data })),
      },
      student: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 90, ...create })),
      },
      studentEnrollment: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 95, ...create })),
      },
      guardian: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 85, ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 85, ...data })),
      },
      studentGuardian: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: 88, ...create })),
      },
    } as any;
  };

  it('seedRoles should seed all 5 Edvnt roles', async () => {
    const prisma = createMockPrisma();
    const result = await seedRoles(prisma);

    expect(prisma.role.upsert).toHaveBeenCalledTimes(5);
    expect(result.roleMap.has('SUPER_ADMIN')).toBe(true);
    expect(result.roleMap.has('SCHOOL_ADMIN')).toBe(true);
    expect(result.roleMap.has('TEACHER')).toBe(true);
    expect(result.roleMap.has('STUDENT')).toBe(true);
    expect(result.roleMap.has('PARENT')).toBe(true);
  });

  it('seedActions should seed module actions and legacy permissions', async () => {
    const prisma = createMockPrisma();
    await seedActions(prisma);

    expect(prisma.applicationModuleAction.upsert).toHaveBeenCalled();
    expect(prisma.permission.upsert).toHaveBeenCalled();
  });

  it('seedModules should seed system modules with actions', async () => {
    const prisma = createMockPrisma();
    await seedModules(prisma);

    expect(prisma.module.upsert).toHaveBeenCalled();
  });

  it('seedTenants should seed the demo school tenant', async () => {
    const prisma = createMockPrisma();
    const tenant = await seedTenants(prisma);

    expect(tenant.slug).toBe('greenwood-academy');
    expect(prisma.tenant.create).toHaveBeenCalled();
  });

  it('seedAcademics should configure year, class, section, and subject', async () => {
    const prisma = createMockPrisma();
    const academics = await seedAcademics(prisma, 1);

    expect(academics.academicYear.name).toBe('2026-2027');
    expect(academics.gradeClass.code).toBe('G7');
    expect(academics.section.code).toBe('A');
    expect(academics.mathSubject.code).toBe('MATH7');
  });

  it('seedSuperAdmin should strictly enforce platform scope (tenant_id === null)', async () => {
    const prisma = createMockPrisma();
    const user = await seedSuperAdmin(prisma, 'dummy-hash');

    expect(user.tenant_id).toBeNull();
    expect(user.email).toBe('superadmin@edvnt.io');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenant_id: null,
          email: 'superadmin@edvnt.io',
        }),
      }),
    );
    expect(prisma.userAccess.create).toHaveBeenCalled();
  });

  it('seedSchoolAdmin should bind user to the given tenant', async () => {
    const prisma = createMockPrisma();
    const user = await seedSchoolAdmin(prisma, 42, 'dummy-hash');

    expect(user.tenant_id).toBe(42);
    expect(user.email).toBe('admin@greenwood.school');
    expect(prisma.userAccess.create).toHaveBeenCalled();
  });

  it('seedTeachers should create Teacher user, profile, and assignment', async () => {
    const prisma = createMockPrisma();
    const { user, teacher } = await seedTeachers(prisma, 42, 'dummy-hash', {
      academicYearId: 100,
      classId: 200,
      sectionId: 300,
      subjectId: 400,
    });

    expect(user.tenant_id).toBe(42);
    expect(teacher.employee_id).toBe('EMP-2026-001');
    expect(prisma.teacherAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          is_class_teacher: true,
        }),
      }),
    );
  });

  it('seedStudents should create Student user, profile, and enrollment', async () => {
    const prisma = createMockPrisma();
    const { user, student } = await seedStudents(prisma, 42, 'dummy-hash', {
      academicYearId: 100,
      classId: 200,
      sectionId: 300,
    });

    expect(user.tenant_id).toBe(42);
    expect(student.admission_number).toBe('ADM-2026-001');
    expect(prisma.studentEnrollment.upsert).toHaveBeenCalled();
  });

  it('seedParents should create Guardian profile and link to Student', async () => {
    const prisma = createMockPrisma();
    const { user, guardian } = await seedParents(prisma, 42, 'dummy-hash', 90);

    expect(user.tenant_id).toBe(42);
    expect(guardian.email).toBe('parent@greenwood.school');
    expect(prisma.studentGuardian.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id_student_id_guardian_id: {
            tenant_id: 42,
            student_id: 90,
            guardian_id: guardian.id,
          },
        },
      }),
    );
  });
});
