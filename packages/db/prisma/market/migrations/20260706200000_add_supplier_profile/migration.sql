-- CreateTable
CREATE TABLE "supplier_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "county" TEXT NOT NULL,
    "subCounty" TEXT,
    "categories" JSONB NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_profiles_userId_key" ON "supplier_profiles"("userId");

-- CreateIndex
CREATE INDEX "supplier_profiles_county_idx" ON "supplier_profiles"("county");
