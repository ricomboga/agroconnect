-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "farms_ownerId_deletedAt_idx" ON "farms"("ownerId", "deletedAt");
