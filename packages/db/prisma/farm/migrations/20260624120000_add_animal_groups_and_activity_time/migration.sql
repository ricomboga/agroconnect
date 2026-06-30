-- AddColumn: scheduledTime to activities
ALTER TABLE "activities" ADD COLUMN "scheduledTime" TEXT;

-- AddColumn: assignedToWorkerId to activities (if not already present)
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "assignedToWorkerId" TEXT;

-- CreateTable: animal_groups
CREATE TABLE "animal_groups" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "breed" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "animal_groups_farmId_idx" ON "animal_groups"("farmId");

-- AddForeignKey
ALTER TABLE "animal_groups" ADD CONSTRAINT "animal_groups_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
