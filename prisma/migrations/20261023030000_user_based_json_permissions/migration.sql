-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_tenant_id_fkey";
ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_user_id_fkey";
ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_permission_id_fkey";
ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_tenant_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "user_permissions" CASCADE;

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permissions" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_key" ON "user_permissions"("user_id");
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
