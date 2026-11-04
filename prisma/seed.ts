import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CryptoService } from '../src/modules/auth/services/crypto.service.js';
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
} from './seeders/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[SEED ERROR] DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const cryptoService = new CryptoService();

async function main() {
  console.log('====================================================');
  console.log('          Starting Edvnt Database Seeding           ');
  console.log('====================================================');

  // 1. System Roles, Actions & Application Modules
  await seedRoles(prisma);
  await seedActions(prisma);
  await seedModules(prisma);

  // 2. Demo School Tenant
  const tenant = await seedTenants(prisma);

  // 4. Default Seed Password
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'Password123!';
  const passwordHash = await cryptoService.hashPassword(defaultPassword);

  // 5. User for Each System Role
  // 5.1 Platform Super Admin (tenant_id: null)
  await seedSuperAdmin(prisma, passwordHash);

  // 5.2 School Administrator (tenant_id: tenant.id)
  await seedSchoolAdmin(prisma, tenant.id, passwordHash);

  // 6. Domain Profiles & Academic Structure (when domain tables are migrated)
  try {
    // Academic Structure
    const academics = await seedAcademics(prisma, tenant.id);

    // Teacher (tenant_id: tenant.id, employee_id: EMP-2026-001, Class Teacher)
    await seedTeachers(prisma, tenant.id, passwordHash, {
      academicYearId: academics.academicYear.id,
      classId: academics.gradeClass.id,
      sectionId: academics.section.id,
      subjectId: academics.mathSubject.id,
    });

    // Student (tenant_id: tenant.id, admission_number: ADM-2026-001, Enrolled in G7-A)
    const { student } = await seedStudents(prisma, tenant.id, passwordHash, {
      academicYearId: academics.academicYear.id,
      classId: academics.gradeClass.id,
      sectionId: academics.section.id,
    });

    // Parent / Guardian (tenant_id: tenant.id, Guardian profile, Linked as MOTHER)
    await seedParents(prisma, tenant.id, passwordHash, student.id);
  } catch (err: any) {
    if (err?.code === 'P2021') {
      console.log('Domain tables not yet migrated into database. Skipping domain profiles seed.');
    } else {
      throw err;
    }
  }

  console.log('====================================================');
  console.log('       Edvnt Database Seeding Completed Cleanly     ');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Seed process failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
