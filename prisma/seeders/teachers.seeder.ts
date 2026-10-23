import type { PrismaClient, Teacher, User } from '../../src/generated/prisma/client.js';

export interface SeededTeacherResult {
  user: User;
  teacher: Teacher;
}

export async function seedTeachers(
  prisma: PrismaClient,
  tenantId: number,
  passwordHash: string,
  academicContext?: {
    academicYearId: number;
    classId: number;
    sectionId: number;
    subjectId: number;
  },
): Promise<SeededTeacherResult> {
  console.log('[TeachersSeeder] Seeding Teacher user and domain profile...');

  const role = await prisma.role.findUnique({
    where: { code: 'TEACHER' },
  });

  if (!role) {
    throw new Error('[TeachersSeeder] Role TEACHER not found. Run roles.seeder first.');
  }

  const email = 'teacher@greenwood.school';
  let user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        role_id: role.id,
        tenant_id: tenantId,
        first_name: 'Sarah',
        last_name: 'Jenkins',
        phone: '+1-555-0103',
        status: 1,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role_id: role.id,
        tenant_id: tenantId,
        first_name: 'Sarah',
        last_name: 'Jenkins',
        phone: '+1-555-0103',
        status: 1,
      },
    });
  }

  // Domain Profile: Teacher
  const teacher = await prisma.teacher.upsert({
    where: {
      tenant_id_employee_id: {
        tenant_id: tenantId,
        employee_id: 'EMP-2026-001',
      },
    },
    update: {
      user_id: user.id,
      status: 1,
    },
    create: {
      tenant_id: tenantId,
      user_id: user.id,
      employee_id: 'EMP-2026-001',
      status: 1,
    },
  });

  // Assign class teacher / subject if academic context is provided
  if (academicContext) {
    const existingAssignment = await prisma.teacherAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        teacher_id: teacher.id,
        academic_year_id: academicContext.academicYearId,
        class_id: academicContext.classId,
        section_id: academicContext.sectionId,
        deleted_at: null,
      },
    });

    if (!existingAssignment) {
      await prisma.teacherAssignment.create({
        data: {
          tenant_id: tenantId,
          teacher_id: teacher.id,
          academic_year_id: academicContext.academicYearId,
          class_id: academicContext.classId,
          section_id: academicContext.sectionId,
          subject_id: academicContext.subjectId,
          is_class_teacher: true,
          status: 1,
        },
      });
      console.log(`[TeachersSeeder] Assigned Teacher (${teacher.employee_id}) as Class Teacher.`);
    }
  }

  // Configure Teacher UserAccess permissions
  const permissions = {
    academics: ['1003', '1005', '1014'],
    attendance: ['1001', '1002', '1003', '1005', '1014', '1021'],
    assignments: ['1003', '1005', '1015'],
    examinations: ['1001', '1002', '1003', '1005', '1014', '1017'],
  };

  const permissionString = JSON.stringify(permissions);

  const existingAccess = await prisma.userAccess.findFirst({
    where: { user_id: user.id, deleted_at: null },
  });

  if (existingAccess) {
    await prisma.userAccess.update({
      where: { id: existingAccess.id },
      data: {
        user_email: user.email,
        permission: permissionString,
        is_individual: true,
      },
    });
  } else {
    await prisma.userAccess.create({
      data: {
        user_id: user.id,
        user_email: user.email,
        is_individual: true,
        permission: permissionString,
      },
    });
  }

  console.log(`[TeachersSeeder] Seeded Teacher: ${user.email} (ID: ${user.id}, Employee: ${teacher.employee_id})`);
  return { user, teacher };
}
