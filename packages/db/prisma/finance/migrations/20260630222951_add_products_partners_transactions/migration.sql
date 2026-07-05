-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('bank', 'microfinance', 'sacco');

-- CreateEnum
CREATE TYPE "LoanCategory" AS ENUM ('back_to_school', 'farm_input', 'asset_finance', 'emergency', 'general');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "loan_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "minLoanKes" DECIMAL(12,2) NOT NULL,
    "maxLoanKes" DECIMAL(12,2) NOT NULL,
    "processingDays" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LoanCategory" NOT NULL,
    "description" TEXT,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "minAmountKes" DECIMAL(12,2) NOT NULL,
    "maxAmountKes" DECIMAL(12,2) NOT NULL,
    "repaymentMonths" INTEGER NOT NULL,
    "eligibilityBand" "CreditBand" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amountKes" DECIMAL(12,2) NOT NULL,
    "category" TEXT NOT NULL,
    "linkedTo" TEXT,
    "buyerSupplier" TEXT,
    "date" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loan_products_partnerId_idx" ON "loan_products"("partnerId");

-- CreateIndex
CREATE INDEX "transactions_farmerId_idx" ON "transactions"("farmerId");

-- AddForeignKey
ALTER TABLE "loan_products" ADD CONSTRAINT "loan_products_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "loan_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
