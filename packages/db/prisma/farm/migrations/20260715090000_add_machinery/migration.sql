-- CreateEnum
CREATE TYPE "MachineryType" AS ENUM ('irrigation', 'tillage', 'spraying', 'harvesting', 'transport', 'processing', 'other');

-- CreateEnum
CREATE TYPE "MachineryCondition" AS ENUM ('good', 'fair', 'worn', 'broken');

-- CreateTable
CREATE TABLE "machinery" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MachineryType" NOT NULL,
    "condition" "MachineryCondition" NOT NULL DEFAULT 'good',
    "acquiredAt" DATE NOT NULL,
    "disposedAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machinery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machinery_farmId_idx" ON "machinery"("farmId");

-- AddForeignKey
ALTER TABLE "machinery" ADD CONSTRAINT "machinery_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
