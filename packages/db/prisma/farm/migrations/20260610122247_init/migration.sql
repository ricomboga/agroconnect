-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('clay', 'loam', 'sandy', 'silty', 'peaty', 'chalky');

-- CreateEnum
CREATE TYPE "WaterSource" AS ENUM ('rain', 'irrigation', 'borehole', 'river', 'mixed');

-- CreateEnum
CREATE TYPE "FarmStatus" AS ENUM ('active', 'fallow', 'sold');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('planting', 'irrigation', 'fertilising', 'pesticide', 'harvesting', 'weeding', 'other');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('pending', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other');

-- CreateEnum
CREATE TYPE "QualityGrade" AS ENUM ('A', 'B', 'C', 'reject');

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationLat" DECIMAL(10,7) NOT NULL,
    "locationLng" DECIMAL(10,7) NOT NULL,
    "county" TEXT NOT NULL,
    "subCounty" TEXT,
    "areaAcres" DECIMAL(8,2) NOT NULL,
    "soilType" "SoilType",
    "waterSource" "WaterSource",
    "status" "FarmStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_plots" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaAcres" DECIMAL(6,2) NOT NULL,
    "currentCrop" TEXT,
    "currentCropPlantedAt" DATE,
    "polygonGeojson" JSONB,

    CONSTRAINT "farm_plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "plotId" TEXT,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledDate" DATE NOT NULL,
    "completedDate" DATE,
    "status" "ActivityStatus" NOT NULL DEFAULT 'pending',
    "labourCostKes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inputs" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "activityId" TEXT,
    "type" "InputType" NOT NULL,
    "productName" TEXT NOT NULL,
    "supplierId" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCostKes" DECIMAL(10,2) NOT NULL,
    "totalCostKes" DECIMAL(12,2) NOT NULL,
    "appliedDate" DATE NOT NULL,
    "notes" TEXT,

    CONSTRAINT "inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "plotId" TEXT,
    "crop" TEXT NOT NULL,
    "variety" TEXT,
    "quantityKg" DECIMAL(10,2) NOT NULL,
    "qualityGrade" "QualityGrade",
    "harvestDate" DATE NOT NULL,
    "storageLocation" TEXT,
    "soldQuantityKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "avgPriceKes" DECIMAL(8,2),
    "totalRevenueKes" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_farmId_scheduledDate_idx" ON "activities"("farmId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "farm_plots" ADD CONSTRAINT "farm_plots_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
