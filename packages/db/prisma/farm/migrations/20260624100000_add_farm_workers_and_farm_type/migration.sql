-- CreateEnum
CREATE TYPE "FarmType" AS ENUM ('crop', 'animal', 'both');

-- CreateEnum
CREATE TYPE "FarmWorkerRole" AS ENUM ('manager', 'field_worker', 'harvester', 'sprayer', 'driver');

-- AlterTable
ALTER TABLE "farms" ADD COLUMN "farmType" "FarmType" NOT NULL DEFAULT 'crop';

-- AlterTable
ALTER TABLE "farm_plots" ADD COLUMN "plantingDate" DATE,
ADD COLUMN "cropVariety" TEXT;

-- AlterTable
ALTER TABLE "activities" ADD COLUMN "assignedToWorkerId" TEXT;

-- CreateTable
CREATE TABLE "farm_workers" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FarmWorkerRole" NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "farm_workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farm_workers_farmId_idx" ON "farm_workers"("farmId");

-- CreateIndex
CREATE INDEX "farm_workers_userId_idx" ON "farm_workers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_workers_farmId_userId_key" ON "farm_workers"("farmId", "userId");

-- AddForeignKey
ALTER TABLE "farm_workers" ADD CONSTRAINT "farm_workers_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
