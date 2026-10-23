-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "level" VARCHAR(50) NOT NULL DEFAULT 'school',
    "description" TEXT,
    "action" JSONB NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "system_defined" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_by" INTEGER,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_user_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "user_permissions" CASCADE;

-- CreateTable
CREATE TABLE "user_access" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "user_email" VARCHAR(255),
    "is_individual" BOOLEAN NOT NULL DEFAULT true,
    "permission" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_by" INTEGER,

    CONSTRAINT "user_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");
CREATE INDEX "modules_code_idx" ON "modules"("code");
CREATE INDEX "modules_status_idx" ON "modules"("status");

-- CreateIndex
CREATE INDEX "user_access_user_id_idx" ON "user_access"("user_id");
CREATE INDEX "user_access_user_email_idx" ON "user_access"("user_email");
CREATE INDEX "user_access_is_individual_idx" ON "user_access"("is_individual");

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
