-- AlterTable
ALTER TABLE "Department"
ADD COLUMN IF NOT EXISTS "code" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Backfill existing rows with deterministic unique codes before enforcing NOT NULL.
WITH numbered_departments AS (
  SELECT
    "id",
    CONCAT('DEPT-', LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", "id")::text, 3, '0')) AS generated_code
  FROM "Department"
)
UPDATE "Department" AS department
SET "code" = numbered_departments.generated_code
FROM numbered_departments
WHERE department."id" = numbered_departments."id"
  AND department."code" IS NULL;

ALTER TABLE "Department"
ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Department_status_idx" ON "Department"("status");
