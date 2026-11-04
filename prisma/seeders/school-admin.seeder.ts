import type { PrismaClient, User } from '../../src/generated/prisma/client.js';

export async function seedSchoolAdmin(
  prisma: PrismaClient,
  tenantId: number,
  passwordHash: string,
): Promise<User> {
  console.log('[SchoolAdminSeeder] Seeding School Administrator...');

  const role = await prisma.role.findUnique({
    where: { code: 'SCHOOL_ADMIN' },
  });

  if (!role) {
    throw new Error('[SchoolAdminSeeder] Role SCHOOL_ADMIN not found. Run roles.seeder first.');
  }

  const email = 'admin@greenwood.school';
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
        first_name: 'Arthur',
        last_name: 'Pendelton',
        phone: '+1-555-0102',
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
        first_name: 'Arthur',
        last_name: 'Pendelton',
        phone: '+1-555-0102',
        status: 1,
      },
    });
  }

  // Configure Tenant School Admin UserAccess permissions
  const permissions = {
    school: ['1001', '1002', '1003', '1005', '1006', '1012'],
    users: ['1001', '1002', '1003', '1004', '1005', '1006', '1010', '1012'],
    invitations: ['1001', '1002', '1003', '1004', '1005', '1006', '1009'],
    academics: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1013', '1014'],
    attendance: ['1001', '1002', '1003', '1005', '1006', '1012', '1014', '1021'],
    assignments: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1015'],
    examinations: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1014', '1015', '1017', '1021'],
    reports: ['1001', '1002', '1003', '1005', '1006', '1007', '1012', '1014', '1015', '1017', '1021'],
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

  console.log(`[SchoolAdminSeeder] Seeded School Admin: ${user.email} (ID: ${user.id}, Tenant: ${tenantId})`);
  return user;
}
