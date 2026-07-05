-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('extension_officer', 'vet_officer', 'agronomist', 'soil_lab', 'equipment_dealer');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- CreateTable
CREATE TABLE "service_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "specialisations" JSONB NOT NULL,
    "countiesServed" JSONB NOT NULL,
    "bio" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verificationDocs" JSONB,
    "maxFarmers" INTEGER NOT NULL DEFAULT 50,
    "ratingAvg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_expert_assignments" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmer_expert_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_userId_key" ON "service_providers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_expert_assignments_farmerId_key" ON "farmer_expert_assignments"("farmerId");

-- CreateIndex
CREATE INDEX "farmer_expert_assignments_expertId_idx" ON "farmer_expert_assignments"("expertId");
