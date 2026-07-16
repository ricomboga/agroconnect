-- AlterTable
ALTER TABLE "users" ADD COLUMN "idNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_idNumber_key" ON "users"("idNumber");
