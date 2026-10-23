-- CreateTable
CREATE TABLE "application_module_actions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "system_defined" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "deleted_by" INTEGER,
    "created_by_type" VARCHAR(50),
    "created_by_id" INTEGER,
    "updated_by_type" VARCHAR(50),
    "updated_by_id" INTEGER,
    "deleted_by_type" VARCHAR(50),
    "deleted_by_id" INTEGER,

    CONSTRAINT "application_module_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_module_actions_code_key" ON "application_module_actions"("code");
CREATE INDEX "application_module_actions_code_idx" ON "application_module_actions"("code");
CREATE INDEX "application_module_actions_status_idx" ON "application_module_actions"("status");
