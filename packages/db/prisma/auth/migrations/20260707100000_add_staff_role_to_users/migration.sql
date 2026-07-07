-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('admin', 'county_admin', 'moderator');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffRole" "StaffRole" NOT NULL DEFAULT 'admin';
