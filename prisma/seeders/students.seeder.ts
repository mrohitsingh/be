import type { PrismaClient, Student, User } from '../../src/generated/prisma/client.js';

export interface SeededStudentResult {
  user: User;
  student: Student;
}

export async function seedStudents(
  prisma: PrismaClient,
  tenantId: number,
  passwordHash: string,
  academicContext?: {
    academicYearId: number;
    classId: number;
    sectionId: number;
  },
): Promise<SeededStudentResult> {
  console.log('[StudentsSeeder] Seeding Student user and domain profile...');

  const role = await prisma.role.findUnique({
    where: { code: 'STUDENT' },
  });

  if (!role) {
    throw new Error('[StudentsSeeder] Role STUDENT not found. Run roles.seeder first.');
  }

  const email = 'student@greenwood.school';
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
        first_name: 'Liam',
        last_name: 'Harper',
        phone: '+1-555-0104',
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
        first_name: 'Liam',
        last_name: 'Harper',
        phone: '+1-555-0104',
        status: 1,
      },
    });
  }

  // Domain Profile: Student
  const student = await prisma.student.upsert({
    where: {
      tenant_id_admission_number: {
        tenant_id: tenantId,
        admission_number: 'ADM-2026-001',
      },
    },
    update: {
      user_id: user.id,
      first_name: 'Liam',
      last_name: 'Harper',
      date_of_birth: new Date('2012-05-15'),
      gender: 'MALE',
      status: 1,
    },
    create: {
      tenant_id: tenantId,
      user_id: user.id,
      admission_number: 'ADM-2026-001',
      first_name: 'Liam',
      last_name: 'Harper',
      date_of_birth: new Date('2012-05-15'),
      gender: 'MALE',
      status: 1,
    },
  });

  // Enroll in Class/Section if academic context is provided
  if (academicContext) {
    await prisma.studentEnrollment.upsert({
      where: {
        tenant_id_academic_year_id_student_id: {
          tenant_id: tenantId,
          academic_year_id: academicContext.academicYearId,
          student_id: student.id,
        },
      },
      update: {
        class_id: academicContext.classId,
        section_id: academicContext.sectionId,
        roll_number: 1,
        status: 1,
      },
      create: {
        tenant_id: tenantId,
        academic_year_id: academicContext.academicYearId,
        student_id: student.id,
        class_id: academicContext.classId,
        section_id: academicContext.sectionId,
        roll_number: 1,
        status: 1,
      },
    });
    console.log(`[StudentsSeeder] Enrolled Student (${student.admission_number}) in Grade 7 Section A.`);
  }

  // Configure Student UserAccess permissions
  const permissions = {
    academics: ['1003', '1014'],
    attendance: ['1003'],
    assignments: ['1003'],
    examinations: ['1003', '1014'],
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

  console.log(`[StudentsSeeder] Seeded Student: ${user.email} (ID: ${user.id}, Admission: ${student.admission_number})`);
  return { user, student };
}
