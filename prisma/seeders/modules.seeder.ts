import type { PrismaClient } from '../../src/generated/prisma/client.js';

export async function seedModules(prisma: PrismaClient): Promise<void> {
  console.log('[ModulesSeeder] Seeding application modules...');

  const modules = [
    {
      code: 'tenants',
      name: 'Tenant Management',
      level: 'platform',
      description: 'Platform tenant provisioning, status, and subscription operations',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1020'],
    },
    {
      code: 'school',
      name: 'School Settings',
      level: 'school',
      description: 'School institutional configuration and operational metadata',
      action: ['1001', '1002', '1003', '1005', '1006', '1012', '1020'],
    },
    {
      code: 'users',
      name: 'User Management',
      level: 'school',
      description: 'School user profiles, staff, and student directories',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1010', '1012', '1020'],
    },
    {
      code: 'invitations',
      name: 'Invitations',
      level: 'school',
      description: 'Invitation tokens, user onboarding, and access grants',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1009', '1012'],
    },
    {
      code: 'academics',
      name: 'Academic Structure',
      level: 'school',
      description: 'Academic years, classes, sections, and subject syllabi',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1010', '1012', '1013', '1014'],
    },
    {
      code: 'attendance',
      name: 'Attendance Tracking',
      level: 'school',
      description: 'Daily homeroom roll-call, session tracking, and attendance locks',
      action: ['1001', '1002', '1003', '1005', '1006', '1012', '1014', '1021'],
    },
    {
      code: 'assignments',
      name: 'Assignments & Rosters',
      level: 'school',
      description: 'Teacher course assignments, student enrollments, and homework',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1015'],
    },
    {
      code: 'examinations',
      name: 'Examinations',
      level: 'school',
      description: 'Exams, schedules, marks entry, and report card compilation',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1012', '1014', '1015', '1017', '1021'],
    },
    {
      code: 'reports',
      name: 'Analytics & Reporting',
      level: 'school',
      description: 'Operational statistics, student progress reports, and audit logs',
      action: ['1001', '1002', '1003', '1005', '1006', '1007', '1012', '1014', '1015', '1017', '1021'],
    },
    {
      code: 'prmsn',
      name: 'Manage Permission: Permission',
      level: 'system',
      description: 'Granular system access rules and permission mappings',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1020'],
    },
    {
      code: 'module',
      name: 'Manage Permission: Module',
      level: 'system',
      description: 'System functional modules registry and action assignments',
      action: ['1001', '1002', '1003', '1004', '1005', '1006', '1020'],
    },
  ];

  for (const mod of modules) {
    const actionString = typeof mod.action === 'string' ? mod.action : JSON.stringify(mod.action);

    await prisma.module.upsert({
      where: { code: mod.code },
      update: {
        name: mod.name,
        level: mod.level,
        description: mod.description,
        action: actionString,
        status: 1,
        system_defined: 1,
      },
      create: {
        code: mod.code,
        name: mod.name,
        level: mod.level,
        description: mod.description,
        action: actionString,
        status: 1,
        system_defined: 1,
      },
    });
  }

  console.log(`[ModulesSeeder] Seeded ${modules.length} application modules.`);
}
