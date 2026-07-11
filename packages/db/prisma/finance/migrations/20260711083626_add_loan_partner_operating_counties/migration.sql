-- AlterTable
ALTER TABLE "loan_partners" ADD COLUMN     "operatingCounties" TEXT[] DEFAULT ARRAY[]::TEXT[];
