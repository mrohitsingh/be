import type { Guardian, PrismaClient, User } from '../../src/generated/prisma/client.js';

export interface SeededParentResult {
  user: User;
  guardian: Guardian;
}

export async function seedParents(
  prisma: PrismaClient,
  tenantId: number,
  passwordHash: string,
  studentId?: number,
): Promise<SeededParentResult> {
  console.log('[ParentsSeeder] Seeding Parent/Guardian user and domain profile...');

  const role = await prisma.role.findUnique({
    where: { code: 'PARENT' },
  });

  if (!role) {
    throw new Error('[ParentsSeeder] Role PARENT not found. Run roles.seeder first.');
  }

  const email = 'parent@greenwood.school';
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
        first_name: 'Eleanor',
        last_name: 'Harper',
        phone: '+1-555-0105',
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
        first_name: 'Eleanor',
        last_name: 'Harper',
        phone: '+1-555-0105',
        status: 1,
      },
    });
  }

  // Domain Profile: Guardian
  let guardian = await prisma.guardian.findFirst({
    where: {
      tenant_id: tenantId,
      user_id: user.id,
      deleted_at: null,
    },
  });

  if (!guardian) {
    guardian = await prisma.guardian.create({
      data: {
        tenant_id: tenantId,
        user_id: user.id,
        first_name: 'Eleanor',
        last_name: 'Harper',
        email,
        phone: '+1-555-0105',
        status: 1,
      },
    });
  } else {
    guardian = await prisma.guardian.update({
      where: { id: guardian.id },
      data: {
        first_name: 'Eleanor',
        last_name: 'Harper',
        email,
        phone: '+1-555-0105',
        status: 1,
      },
    });
  }

  // Link to Student if studentId is provided
  if (studentId) {
    await prisma.studentGuardian.upsert({
      where: {
        tenant_id_student_id_guardian_id: {
          tenant_id: tenantId,
          student_id: studentId,
          guardian_id: guardian.id,
        },
      },
      update: {
        relationship_type: 'MOTHER',
        is_primary: true,
      },
      create: {
        tenant_id: tenantId,
        student_id: studentId,
        guardian_id: guardian.id,
        relationship_type: 'MOTHER',
        is_primary: true,
      },
    });
    console.log(`[ParentsSeeder] Linked Guardian (${guardian.first_name} ${guardian.last_name}) to Student (${studentId}) as MOTHER.`);
  }

  // Configure Parent UserAccess permissions
  const permissions = {
    attendance: ['1003'],
    assignments: ['1003'],
    examinations: ['1003', '1014'],
    reports: ['1003', '1014'],
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

  console.log(`[ParentsSeeder] Seeded Parent: ${user.email} (ID: ${user.id}, Guardian ID: ${guardian.id})`);
  return { user, guardian };
}
