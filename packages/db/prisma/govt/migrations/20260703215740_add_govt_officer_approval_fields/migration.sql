-- CreateEnum
CREATE TYPE "SubsidyProgramType" AS ENUM ('fertiliser_subsidy', 'seed_distribution', 'equipment', 'training', 'cash_transfer', 'irrigation');

-- AlterTable
ALTER TABLE "license_applications" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "officerId" TEXT;

-- AlterTable
ALTER TABLE "subsidy_applications" ADD COLUMN     "approvedItems" TEXT,
ADD COLUMN     "certNumber" TEXT,
ADD COLUMN     "collectionPoint" TEXT,
ADD COLUMN     "county" TEXT,
ADD COLUMN     "deliveryDate" DATE,
ADD COLUMN     "officerId" TEXT,
ADD COLUMN     "officerNotes" TEXT,
ADD COLUMN     "transportProvided" BOOLEAN;

-- AlterTable
ALTER TABLE "subsidy_programs" ADD COLUMN     "applicationOpenDate" DATE,
ADD COLUMN     "collectionPoints" JSONB,
ADD COLUMN     "distributionMethod" TEXT,
ADD COLUMN     "eligibleFarmerSubtypes" JSONB,
ADD COLUMN     "farmRegistrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "idVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemDistributed" TEXT,
ADD COLUMN     "maxBeneficiaries" INTEGER,
ADD COLUMN     "maxFarmSizeAcres" DECIMAL(8,2),
ADD COLUMN     "minFarmSizeAcres" DECIMAL(8,2),
ADD COLUMN     "onePerFarmer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireActiveCrop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalBudgetKes" DECIMAL(14,2),
ADD COLUMN     "type" "SubsidyProgramType";

