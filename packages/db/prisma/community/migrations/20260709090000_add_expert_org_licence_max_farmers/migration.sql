-- AlterTable
-- These were collected by the admin "Create Vet/Expert Account" wizard but
-- never persisted anywhere — closing that gap.
ALTER TABLE "experts" ADD COLUMN "organisation" TEXT;
ALTER TABLE "experts" ADD COLUMN "licenceNumber" TEXT;
ALTER TABLE "experts" ADD COLUMN "maxFarmers" INTEGER;
