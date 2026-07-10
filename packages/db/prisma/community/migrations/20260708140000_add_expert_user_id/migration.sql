-- AlterTable
-- Links an Expert directory entry back to the auth-service User account
-- created alongside it, so the admin panel can look up "the expert record
-- for this user" later (edit flow) — mirrors SupplierProfile.userId.
ALTER TABLE "experts" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "experts_userId_key" ON "experts"("userId");
