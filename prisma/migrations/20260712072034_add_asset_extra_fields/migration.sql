-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "description" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "warrantyEndDate" DATE,
ADD COLUMN     "warrantyStartDate" DATE;
