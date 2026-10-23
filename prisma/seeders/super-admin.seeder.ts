import type { PrismaClient, User } from '../../src/generated/prisma/client.js';

export async function seedSuperAdmin(
  prisma: PrismaClient,
  passwordHash: string,
): Promise<User> {
  console.log('[SuperAdminSeeder] Seeding platform Super Admin...');

  const role = await prisma.role.findUnique({
    where: { code: 'SUPER_ADMIN' },
  });

  if (!role) {
    throw new Error('[SuperAdminSeeder] Role SUPER_ADMIN not found. Run roles.seeder first.');
  }

  const email = 'superadmin@edvnt.io';
  let user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        role_id: role.id,
        tenant_id: null, // Strictly platform scope per Edvnt invariants
        first_name: 'Platform',
        last_name: 'SuperAdmin',
        phone: '+1-555-0101',
        status: 1,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role_id: role.id,
        tenant_id: null, // Strictly platform scope per Edvnt invariants
        first_name: 'Platform',
        last_name: 'SuperAdmin',
        phone: '+1-555-0101',
        status: 1,
      },
    });
  }

  // Configure Platform UserAccess permissions
  const permissions = {
    tenants: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1020'],
    subscriptions: ['1001', '1002', '1003', '1005', '1006', '1012'],
    permissions: ['1001', '1002', '1003', '1004', '1005', '1006', '1020'],
    audit: ['1003', '1006', '1020'],
    prmsn: ['1001', '1002', '1003', '1004', '1005', '1006', '1020'],
    module: ['1001', '1002', '1003', '1004', '1005', '1006', '1020'],
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

  console.log(`[SuperAdminSeeder] Seeded Super Admin: ${user.email} (ID: ${user.id}, Platform Scope)`);
  return user;
}
