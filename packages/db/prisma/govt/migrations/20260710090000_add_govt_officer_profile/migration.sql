-- CreateTable
CREATE TABLE "govt_officer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ministry" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "assignedCounty" TEXT NOT NULL,
    "assignedSubCounty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "govt_officer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "govt_officer_profiles_userId_key" ON "govt_officer_profiles"("userId");
