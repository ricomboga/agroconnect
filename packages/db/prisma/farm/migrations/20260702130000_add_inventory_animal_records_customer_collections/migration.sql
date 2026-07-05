-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InputType" NOT NULL,
    "emoji" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "purchasedQty" DECIMAL(10,3) NOT NULL,
    "usedQty" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "totalPurchasedQty" DECIMAL(10,3) NOT NULL,
    "costPerUnit" DECIMAL(10,2) NOT NULL,
    "supplier" TEXT NOT NULL,
    "lastUsedDate" DATE,
    "scheduledUseDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_product_records" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalGroupId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "productType" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "soldQty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_product_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_collections" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "productType" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "takenDate" DATE NOT NULL,
    "paidDate" DATE,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_farmId_idx" ON "inventory_items"("farmId");

-- CreateIndex
CREATE INDEX "animal_product_records_farmId_idx" ON "animal_product_records"("farmId");

-- CreateIndex
CREATE INDEX "customer_collections_farmId_idx" ON "customer_collections"("farmId");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_product_records" ADD CONSTRAINT "animal_product_records_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collections" ADD CONSTRAINT "customer_collections_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
