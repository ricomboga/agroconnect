-- AlterTable
ALTER TABLE "loan_partners" ADD COLUMN     "activeFarmers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "interestRateAnnual" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "repaymentRatePct" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "farmer_lender_assignments" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmer_lender_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "farmer_lender_assignments_farmerId_key" ON "farmer_lender_assignments"("farmerId");
