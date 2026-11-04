-- AlterTable
ALTER TABLE "modules" ALTER COLUMN "action" TYPE TEXT USING "action"::text;

-- AlterTable
ALTER TABLE "user_access" ALTER COLUMN "permission" TYPE TEXT USING "permission"::text;
