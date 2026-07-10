-- AlterTable
-- Lets an expert (vet/agronomist/soil-lab/extension officer) declare which
-- sub-counties they actually serve, so farmer search can match sub-county
-- first before falling back to county / region.
ALTER TABLE "experts" ADD COLUMN "subCountiesServed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
