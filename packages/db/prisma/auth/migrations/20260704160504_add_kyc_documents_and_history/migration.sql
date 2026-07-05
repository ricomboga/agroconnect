-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('national_id', 'business_cert', 'kvb_licence', 'pcpb_licence', 'other');

-- CreateEnum
CREATE TYPE "KycDocStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "KycDocType" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "KycDocStatus" NOT NULL DEFAULT 'pending',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_history_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kyc_documents_userId_idx" ON "kyc_documents"("userId");

-- CreateIndex
CREATE INDEX "kyc_history_entries_userId_idx" ON "kyc_history_entries"("userId");
