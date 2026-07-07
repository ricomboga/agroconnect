-- AlterEnum
ALTER TYPE "FarmStatus" ADD VALUE 'rented_out';

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "skipReason" TEXT;
