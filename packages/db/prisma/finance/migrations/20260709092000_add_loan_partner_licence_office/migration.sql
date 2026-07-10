-- AlterTable
-- licenceNo/paybill/headOffice county+subCounty were collected by the admin
-- "Create Institution" wizard but the wizard never actually created a
-- LoanPartner record at all — closing that gap alongside these columns.
ALTER TABLE "loan_partners" ADD COLUMN "licenceNo" TEXT;
ALTER TABLE "loan_partners" ADD COLUMN "paybill" TEXT;
ALTER TABLE "loan_partners" ADD COLUMN "headOfficeCounty" TEXT;
ALTER TABLE "loan_partners" ADD COLUMN "headOfficeSubCounty" TEXT;
