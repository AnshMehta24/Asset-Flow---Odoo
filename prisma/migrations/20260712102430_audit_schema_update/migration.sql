-- CreateEnum
CREATE TYPE "AuditDiscrepancyStatus" AS ENUM ('OPEN', 'CONFIRMED', 'RESOLVED', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AUDIT_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'AUDIT_CLOSED';

-- DropIndex
DROP INDEX "AuditItem_verification_idx";

-- AlterTable
ALTER TABLE "AuditCycle" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "startedById" TEXT;

-- AlterTable
ALTER TABLE "AuditItem" ADD COLUMN     "discrepancyStatus" "AuditDiscrepancyStatus",
ADD COLUMN     "observedLocation" TEXT,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;

-- CreateIndex
CREATE INDEX "AuditCycle_startedById_idx" ON "AuditCycle"("startedById");

-- CreateIndex
CREATE INDEX "AuditItem_auditCycleId_verification_idx" ON "AuditItem"("auditCycleId", "verification");

-- CreateIndex
CREATE INDEX "AuditItem_auditCycleId_discrepancyStatus_idx" ON "AuditItem"("auditCycleId", "discrepancyStatus");

-- CreateIndex
CREATE INDEX "AuditItem_verifiedById_idx" ON "AuditItem"("verifiedById");

-- CreateIndex
CREATE INDEX "AuditItem_resolvedById_idx" ON "AuditItem"("resolvedById");

-- AddForeignKey
ALTER TABLE "AuditCycle" ADD CONSTRAINT "AuditCycle_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditItem" ADD CONSTRAINT "AuditItem_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
