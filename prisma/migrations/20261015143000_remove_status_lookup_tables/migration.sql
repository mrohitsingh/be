-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "tenants_status_id_fkey";
ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "tenants_subscription_status_id_fkey";
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_status_id_fkey";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_status_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_id_fkey";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_status_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "tenant_statuses" CASCADE;
DROP TABLE IF EXISTS "subscription_statuses" CASCADE;
DROP TABLE IF EXISTS "record_statuses" CASCADE;
DROP TABLE IF EXISTS "user_statuses" CASCADE;
DROP TABLE IF EXISTS "invitation_statuses" CASCADE;

-- AlterTable tenants: rename status_id to status, subscription_status_id to subscription_status
DROP INDEX IF EXISTS "tenants_status_id_idx";
DROP INDEX IF EXISTS "tenants_subscription_status_id_idx";
ALTER TABLE "tenants" RENAME COLUMN "status_id" TO "status";
ALTER TABLE "tenants" RENAME COLUMN "subscription_status_id" TO "subscription_status";
CREATE INDEX "tenants_status_idx" ON "tenants"("status");
CREATE INDEX "tenants_subscription_status_idx" ON "tenants"("subscription_status");

-- AlterTable roles: rename status_id to status
DROP INDEX IF EXISTS "roles_status_id_idx";
ALTER TABLE "roles" RENAME COLUMN "status_id" TO "status";
CREATE INDEX "roles_status_idx" ON "roles"("status");

-- AlterTable permissions: rename status_id to status
DROP INDEX IF EXISTS "permissions_status_id_idx";
ALTER TABLE "permissions" RENAME COLUMN "status_id" TO "status";
CREATE INDEX "permissions_status_idx" ON "permissions"("status");

-- AlterTable users: rename status_id to status
DROP INDEX IF EXISTS "users_status_id_idx";
ALTER TABLE "users" RENAME COLUMN "status_id" TO "status";
CREATE INDEX "users_status_idx" ON "users"("status");

-- AlterTable invitations: rename status_id to status
DROP INDEX IF EXISTS "invitations_status_id_idx";
ALTER TABLE "invitations" RENAME COLUMN "status_id" TO "status";
CREATE INDEX "invitations_status_idx" ON "invitations"("status");
