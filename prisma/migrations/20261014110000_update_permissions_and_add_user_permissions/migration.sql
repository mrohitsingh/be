-- AlterTable: Clear legacy permissions and role_permissions safely
DELETE FROM "role_permissions";
DELETE FROM "permissions";

-- Drop old indexes on permissions if they exist
DROP INDEX IF EXISTS "permissions_module_idx";
DROP INDEX IF EXISTS "permissions_scope_idx";

-- AlterTable permissions
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "module";
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "action";
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "permissions" ALTER COLUMN "code" TYPE VARCHAR(50);
ALTER TABLE "permissions" ALTER COLUMN "name" TYPE VARCHAR(100);

-- AlterTable role_permissions: add module column
ALTER TABLE "role_permissions" ADD COLUMN "module" VARCHAR(50) NOT NULL;

-- CreateIndex for role_permissions
DROP INDEX IF EXISTS "role_permissions_global_unique_idx";
DROP INDEX IF EXISTS "role_permissions_tenant_unique_idx";
CREATE INDEX "role_permissions_module_idx" ON "role_permissions"("module");
CREATE UNIQUE INDEX "role_permissions_global_unique_idx" ON "role_permissions" ("role_id", "permission_id", "module") WHERE "tenant_id" IS NULL;
CREATE UNIQUE INDEX "role_permissions_tenant_unique_idx" ON "role_permissions" ("tenant_id", "role_id", "permission_id", "module") WHERE "tenant_id" IS NOT NULL;

-- CreateTable user_permissions
CREATE TABLE "user_permissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "tenant_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for user_permissions
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");
CREATE INDEX "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");
CREATE INDEX "user_permissions_module_idx" ON "user_permissions"("module");
CREATE INDEX "user_permissions_tenant_id_idx" ON "user_permissions"("tenant_id");
CREATE UNIQUE INDEX "user_permissions_global_unique_idx" ON "user_permissions" ("user_id", "permission_id", "module") WHERE "tenant_id" IS NULL;
CREATE UNIQUE INDEX "user_permissions_tenant_unique_idx" ON "user_permissions" ("tenant_id", "user_id", "permission_id", "module") WHERE "tenant_id" IS NOT NULL;

-- AddForeignKey for user_permissions
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
