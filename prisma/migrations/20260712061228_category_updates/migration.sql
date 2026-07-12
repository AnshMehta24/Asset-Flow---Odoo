/*
  Warnings:

  - You are about to drop the column `customFieldValues` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `customFieldSchema` on the `AssetCategory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssetCategoryFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'ENUM');

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "customFieldValues";

-- AlterTable
ALTER TABLE "AssetCategory" DROP COLUMN "customFieldSchema";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "AssetCategoryField" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fieldType" "AssetCategoryFieldType" NOT NULL,
    "enumOptions" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCategoryField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCustomFieldValue" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(14,4),
    "valueDate" DATE,
    "valueEnum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetCategoryField_categoryId_sortOrder_idx" ON "AssetCategoryField"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategoryField_categoryId_key_key" ON "AssetCategoryField"("categoryId", "key");

-- CreateIndex
CREATE INDEX "AssetCustomFieldValue_fieldId_idx" ON "AssetCustomFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCustomFieldValue_assetId_fieldId_key" ON "AssetCustomFieldValue"("assetId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_status_idx" ON "Department"("status");

-- AddForeignKey
ALTER TABLE "AssetCategoryField" ADD CONSTRAINT "AssetCategoryField_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCustomFieldValue" ADD CONSTRAINT "AssetCustomFieldValue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCustomFieldValue" ADD CONSTRAINT "AssetCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "AssetCategoryField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
