-- CreateEnum
CREATE TYPE "quality_grade" AS ENUM ('A', 'B', 'C', 'reject');

-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('active', 'sold', 'expired', 'withdrawn');

-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('seed', 'fertiliser', 'pesticide', 'herbicide', 'equipment', 'veterinary', 'other');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'dispatched', 'delivered');

-- CreateTable
CREATE TABLE "produce_listings" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "harvestId" TEXT,
    "crop" TEXT NOT NULL,
    "variety" TEXT,
    "quantityKg" DECIMAL(10,2) NOT NULL,
    "askingPriceKes" DECIMAL(8,2) NOT NULL,
    "qualityGrade" "quality_grade" NOT NULL,
    "availableFrom" DATE NOT NULL,
    "availableUntil" DATE NOT NULL,
    "locationCounty" TEXT NOT NULL,
    "locationDescription" TEXT,
    "photos" JSONB,
    "status" "listing_status" NOT NULL DEFAULT 'active',
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produce_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "product_category" NOT NULL,
    "brand" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnitKes" DECIMAL(10,2) NOT NULL,
    "stockQuantity" DECIMAL(10,2) NOT NULL,
    "sku" TEXT,
    "countyAvailability" JSONB NOT NULL,
    "photos" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityUnits" DECIMAL(10,2) NOT NULL,
    "unitPriceKes" DECIMAL(10,2) NOT NULL,
    "totalPriceKes" DECIMAL(12,2) NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "notes" TEXT,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commodity_prices" (
    "id" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "priceKes" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commodity_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produce_listings_farmerId_status_idx" ON "produce_listings"("farmerId", "status");

-- CreateIndex
CREATE INDEX "produce_listings_crop_locationCounty_status_idx" ON "produce_listings"("crop", "locationCounty", "status");

-- CreateIndex
CREATE INDEX "produce_listings_availableFrom_availableUntil_idx" ON "produce_listings"("availableFrom", "availableUntil");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_sku_key" ON "supplier_products"("sku");

-- CreateIndex
CREATE INDEX "supplier_products_supplierId_isActive_idx" ON "supplier_products"("supplierId", "isActive");

-- CreateIndex
CREATE INDEX "supplier_products_category_isActive_idx" ON "supplier_products"("category", "isActive");

-- CreateIndex
CREATE INDEX "orders_buyerId_status_idx" ON "orders"("buyerId", "status");

-- CreateIndex
CREATE INDEX "orders_supplierId_status_idx" ON "orders"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "commodity_prices_crop_key" ON "commodity_prices"("crop");
