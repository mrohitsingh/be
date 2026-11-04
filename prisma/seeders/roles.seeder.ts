import type { PrismaClient } from '../../src/generated/prisma/client.js';

export interface SeededRoles {
  roleMap: Map<string, number>;
}

export async function seedRoles(prisma: PrismaClient): Promise<SeededRoles> {
  console.log('[RolesSeeder] Seeding system roles...');

  const roles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      scope: 'PLATFORM',
      status: 1,
    },
    {
      code: 'SCHOOL_ADMIN',
      name: 'School Administrator',
      scope: 'TENANT',
      status: 1,
    },
    {
      code: 'TEACHER',
      name: 'Teacher',
      scope: 'TENANT',
      status: 1,
    },
    {
      code: 'STUDENT',
      name: 'Student',
      scope: 'TENANT',
      status: 1,
    },
    {
      code: 'PARENT',
      name: 'Parent / Guardian',
      scope: 'TENANT',
      status: 1,
    },
  ];

  const roleMap = new Map<string, number>();

  for (const role of roles) {
    const upserted = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        scope: role.scope,
        status: role.status,
      },
      create: role,
    });
    roleMap.set(role.code, upserted.id);
  }

  console.log(`[RolesSeeder] Seeded ${roles.length} system roles.`);
  return { roleMap };
}
