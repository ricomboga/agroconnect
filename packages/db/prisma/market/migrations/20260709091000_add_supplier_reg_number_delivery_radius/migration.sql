-- AlterTable
-- businessRegNumber and deliveryRadiusKm were collected by the admin
-- "Create Supplier Account" wizard but never given real columns —
-- deliveryRadiusKm was previously jammed into the description field as text.
ALTER TABLE "supplier_profiles" ADD COLUMN "businessRegNumber" TEXT;
ALTER TABLE "supplier_profiles" ADD COLUMN "deliveryRadiusKm" TEXT;
