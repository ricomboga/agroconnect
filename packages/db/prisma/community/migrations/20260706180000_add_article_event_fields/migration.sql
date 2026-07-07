-- CreateEnum
CREATE TYPE "article_type" AS ENUM ('news', 'event', 'webinar');

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "joinLink" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "type" "article_type" NOT NULL DEFAULT 'news';

-- CreateIndex
CREATE INDEX "articles_type_isPublished_idx" ON "articles"("type", "isPublished");
