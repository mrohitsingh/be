import type {
  AcademicYear,
  Class,
  PrismaClient,
  Section,
  Subject,
} from '../../src/generated/prisma/client.js';

export interface SeededAcademics {
  academicYear: AcademicYear;
  gradeClass: Class;
  section: Section;
  mathSubject: Subject;
}

export async function seedAcademics(
  prisma: PrismaClient,
  tenantId: number,
): Promise<SeededAcademics> {
  console.log('[AcademicsSeeder] Seeding academic structure...');

  const academicYear = await prisma.academicYear.upsert({
    where: {
      tenant_id_name: {
        tenant_id: tenantId,
        name: '2026-2027',
      },
    },
    update: {
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-05-31'),
      is_current: true,
      status: 1,
    },
    create: {
      tenant_id: tenantId,
      name: '2026-2027',
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-05-31'),
      is_current: true,
      status: 1,
    },
  });

  const gradeClass = await prisma.class.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenantId,
        code: 'G7',
      },
    },
    update: {
      name: 'Grade 7',
      status: 1,
    },
    create: {
      tenant_id: tenantId,
      name: 'Grade 7',
      code: 'G7',
      status: 1,
    },
  });

  const section = await prisma.section.upsert({
    where: {
      tenant_id_class_id_code: {
        tenant_id: tenantId,
        class_id: gradeClass.id,
        code: 'A',
      },
    },
    update: {
      name: 'Section A',
      capacity: 40,
      status: 1,
    },
    create: {
      tenant_id: tenantId,
      class_id: gradeClass.id,
      name: 'Section A',
      code: 'A',
      capacity: 40,
      status: 1,
    },
  });

  const mathSubject = await prisma.subject.upsert({
    where: {
      tenant_id_class_id_code: {
        tenant_id: tenantId,
        class_id: gradeClass.id,
        code: 'MATH7',
      },
    },
    update: {
      name: 'Mathematics',
      status: 1,
    },
    create: {
      tenant_id: tenantId,
      class_id: gradeClass.id,
      name: 'Mathematics',
      code: 'MATH7',
      status: 1,
    },
  });

  console.log(
    `[AcademicsSeeder] Configured Academic Year (${academicYear.name}), Class (${gradeClass.code}), Section (${section.code}), Subject (${mathSubject.code}).`,
  );

  return {
    academicYear,
    gradeClass,
    section,
    mathSubject,
  };
}
