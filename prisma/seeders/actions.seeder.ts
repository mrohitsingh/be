import type { PrismaClient } from '../../src/generated/prisma/client.js';

export async function seedActions(prisma: PrismaClient): Promise<void> {
  console.log('[ActionsSeeder] Seeding application module actions from existing vms_db mapping...');

  const actions = [
    { code: '1001', name: 'Add', status: 1, system_defined: 1 },
    { code: '1002', name: 'Edit', status: 1, system_defined: 1 },
    { code: '1003', name: 'View', status: 1, system_defined: 1 },
    { code: '1004', name: 'Delete', status: 1, system_defined: 1 },
    { code: '1005', name: 'Search', status: 1, system_defined: 1 },
    { code: '1006', name: 'Export', status: 1, system_defined: 1 },
    { code: '1007', name: 'Approve', status: 1, system_defined: 1 },
    { code: '1008', name: 'Reject', status: 1, system_defined: 1 },
    { code: '1009', name: 'Cancel', status: 1, system_defined: 1 },
    { code: '1010', name: 'Import', status: 1, system_defined: 1 },
    { code: '1011', name: 'Move App', status: 1, system_defined: 1 },
    { code: '1012', name: 'Change Status', status: 1, system_defined: 1 },
    { code: '1013', name: 'Clone', status: 1, system_defined: 1 },
    { code: '1014', name: 'Download', status: 1, system_defined: 1 },
    { code: '1015', name: 'Schedule', status: 1, system_defined: 1 },
    { code: '1016', name: 'Add To App', status: 1, system_defined: 1 },
    { code: '1017', name: 'Comment', status: 1, system_defined: 1 },
    { code: '1018', name: 'HR Approval', status: 1, system_defined: 0, created_by: 202, updated_by: 211 },
    { code: '1019', name: 'Finance Approval', status: 1, system_defined: 1 },
    { code: '1020', name: 'Log', status: 1, system_defined: 1 },
    { code: '1021', name: 'Processed', status: 1, system_defined: 1, updated_by: 561 },
    { code: '1022', name: 'Clearance', status: 1, system_defined: 1 },
    { code: '1023', name: 'testing', status: 1, system_defined: 0, created_by: 1369 },
  ];

  for (const action of actions) {
    await prisma.applicationModuleAction.upsert({
      where: { code: action.code },
      update: {
        name: action.name,
        status: action.status,
        system_defined: action.system_defined,
        created_by: action.created_by ?? null,
        updated_by: action.updated_by ?? null,
      },
      create: {
        code: action.code,
        name: action.name,
        status: action.status,
        system_defined: action.system_defined,
        created_by: action.created_by ?? null,
        updated_by: action.updated_by ?? null,
      },
    });

    // Also maintain baseline permissions table for backward compatibility
    await prisma.permission.upsert({
      where: { code: action.code },
      update: { name: action.name, status: action.status },
      create: { code: action.code, name: action.name, status: action.status },
    });
  }

  console.log(`[ActionsSeeder] Seeded ${actions.length} application module actions.`);
}
