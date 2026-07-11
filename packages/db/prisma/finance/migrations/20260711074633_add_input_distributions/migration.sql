-- CreateTable
CREATE TABLE "input_distributions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "valueKes" DECIMAL(12,2) NOT NULL,
    "distributedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "input_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "input_distributions_partnerId_idx" ON "input_distributions"("partnerId");

-- CreateIndex
CREATE INDEX "input_distributions_farmerId_idx" ON "input_distributions"("farmerId");
