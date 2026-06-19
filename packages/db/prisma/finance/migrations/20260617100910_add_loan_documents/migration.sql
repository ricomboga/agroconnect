-- CreateEnum
CREATE TYPE "CreditBand" AS ENUM ('A', 'B', 'C', 'D', 'ineligible');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('agricultural_working_capital', 'back_to_school', 'asset_finance', 'emergency');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted');

-- CreateEnum
CREATE TYPE "LoanDocType" AS ENUM ('national_id', 'land_title', 'farm_photo', 'bank_statement', 'payslip', 'other');

-- CreateTable
CREATE TABLE "credit_scores" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "band" "CreditBand" NOT NULL,
    "maxLoanKes" DECIMAL(12,2) NOT NULL,
    "seasonsOfData" INTEGER NOT NULL,
    "avgYieldScore" DECIMAL(5,2) NOT NULL,
    "inputManagementScore" DECIMAL(5,2) NOT NULL,
    "activityComplianceScore" DECIMAL(5,2) NOT NULL,
    "platformEngagementScore" DECIMAL(5,2) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "amountRequestedKes" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "repaymentMonths" INTEGER NOT NULL,
    "partnerBankId" TEXT,
    "creditScore" DECIMAL(5,2),
    "creditBand" "CreditBand",
    "status" "LoanStatus" NOT NULL DEFAULT 'draft',
    "approvedAmountKes" DECIMAL(12,2),
    "interestRatePct" DECIMAL(5,2),
    "disbursedAt" TIMESTAMP(3),
    "mpesaDisbursementRef" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_documents" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "LoanDocType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_scores_farmerId_key" ON "credit_scores"("farmerId");

-- CreateIndex
CREATE INDEX "loan_applications_farmerId_idx" ON "loan_applications"("farmerId");

-- CreateIndex
CREATE INDEX "loan_documents_loanId_idx" ON "loan_documents"("loanId");

-- AddForeignKey
ALTER TABLE "loan_documents" ADD CONSTRAINT "loan_documents_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
