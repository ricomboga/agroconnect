-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pending', 'submitted', 'under_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SubsidyApplicationStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'disbursed');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('pesticide_use', 'agro_dealer', 'export_permit', 'water_abstraction');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('national_id', 'title_deed', 'kra_pin', 'business_permit', 'other');

-- CreateTable
CREATE TABLE "farm_registrations" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "subCounty" TEXT,
    "areaAcres" DECIMAL(8,2) NOT NULL,
    "landTitle" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pending',
    "registrationRef" TEXT,
    "officerId" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subsidy_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "providerAgency" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "benefitType" TEXT NOT NULL,
    "benefitValue" TEXT NOT NULL,
    "countyEligible" JSONB NOT NULL,
    "deadline" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subsidy_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subsidy_applications" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "status" "SubsidyApplicationStatus" NOT NULL DEFAULT 'submitted',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subsidy_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_applications" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "description" TEXT,
    "status" "LicenseStatus" NOT NULL DEFAULT 'submitted',
    "licenseNumber" TEXT,
    "expiresAt" DATE,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "govt_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "registrationId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "govt_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farm_registrations_farmerId_idx" ON "farm_registrations"("farmerId");

-- CreateIndex
CREATE INDEX "farm_registrations_farmId_idx" ON "farm_registrations"("farmId");

-- CreateIndex
CREATE INDEX "subsidy_applications_farmerId_idx" ON "subsidy_applications"("farmerId");

-- CreateIndex
CREATE INDEX "subsidy_applications_programId_idx" ON "subsidy_applications"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "subsidy_applications_farmerId_programId_key" ON "subsidy_applications"("farmerId", "programId");

-- CreateIndex
CREATE INDEX "license_applications_farmerId_idx" ON "license_applications"("farmerId");

-- CreateIndex
CREATE INDEX "govt_documents_userId_idx" ON "govt_documents"("userId");

-- AddForeignKey
ALTER TABLE "subsidy_applications" ADD CONSTRAINT "subsidy_applications_programId_fkey" FOREIGN KEY ("programId") REFERENCES "subsidy_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "govt_documents" ADD CONSTRAINT "govt_documents_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "farm_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

