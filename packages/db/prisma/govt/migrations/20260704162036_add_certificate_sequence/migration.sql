-- CreateTable
CREATE TABLE "certificate_sequences" (
    "id" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "certificate_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_sequences_county_year_key" ON "certificate_sequences"("county", "year");
