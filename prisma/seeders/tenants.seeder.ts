import type { PrismaClient, Tenant } from '../../src/generated/prisma/client.js';

export async function seedTenants(prisma: PrismaClient): Promise<Tenant> {
  console.log('[TenantsSeeder] Seeding demo school tenant...');

  const slug = 'greenwood-academy';
  let tenant = await prisma.tenant.findFirst({
    where: { slug, deleted_at: null },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Greenwood International School',
        slug,
        code: 'GW01',
        email: 'admin@greenwood.school',
        phone: '+1-555-0100',
        timezone: 'UTC',
        status: 1,
        subscription_status: 1,
      },
    });
    console.log(`[TenantsSeeder] Created demo tenant: ${tenant.name} (ID: ${tenant.id})`);
  } else {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: 'Greenwood International School',
        code: 'GW01',
        status: 1,
        subscription_status: 1,
      },
    });
    console.log(`[TenantsSeeder] Updated demo tenant: ${tenant.name} (ID: ${tenant.id})`);
  }

  return tenant;
}
