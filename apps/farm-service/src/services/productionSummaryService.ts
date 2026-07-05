import { prisma } from '@agroconnect/db/farm';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface CropHarvestTotal {
  cropName: string;
  harvestedKg: number;
  soldKg: number;
  revenueKes: number;
}

export interface AnimalProductTotal {
  productType: string;
  unit: string;
  totalQty: number;
  soldQty: number;
  revenueKes: number;
}

export interface CollectionTotal {
  productType: string;
  totalAmountKes: number;
  totalQty: number;
  unit: string;
}

export interface ProductionSummary {
  cropHarvests: {
    totalHarvestedKg: number;
    totalSoldKg: number;
    totalRevenueKes: number;
    byCrop: CropHarvestTotal[];
  };
  animalProducts: {
    byType: AnimalProductTotal[];
  };
  collections: {
    totalSalesKes: number;
    paidKes: number;
    pendingKes: number;
    byProductType: CollectionTotal[];
  };
}

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

async function farmerFarmIds(farmerId: string): Promise<string[]> {
  const farms = await prisma.farm.findMany({
    where: { ownerId: farmerId, deletedAt: null },
    select: { id: true },
  });
  return farms.map((f: { id: string }) => f.id);
}

function dateFilter(range: DateRange): { gte?: Date; lte?: Date } | undefined {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  };
}

const EMPTY_SUMMARY: ProductionSummary = {
  cropHarvests: { totalHarvestedKg: 0, totalSoldKg: 0, totalRevenueKes: 0, byCrop: [] },
  animalProducts: { byType: [] },
  collections: { totalSalesKes: 0, paidKes: 0, pendingKes: 0, byProductType: [] },
};

export async function getProductionSummary(
  farmerId: string,
  range: DateRange = {},
): Promise<ProductionSummary> {
  const farmIds = await farmerFarmIds(farmerId);
  if (farmIds.length === 0) return EMPTY_SUMMARY;

  const filter = dateFilter(range);

  const [harvests, animalProducts, collections] = await Promise.all([
    prisma.harvest.findMany({
      where: { farmId: { in: farmIds }, ...(filter ? { harvestDate: filter } : {}) },
    }),
    prisma.animalProductRecord.findMany({
      where: { farmId: { in: farmIds }, ...(filter ? { date: filter } : {}) },
    }),
    prisma.customerCollection.findMany({
      where: { farmId: { in: farmIds }, ...(filter ? { takenDate: filter } : {}) },
    }),
  ]);

  const byCropMap = new Map<string, CropHarvestTotal>();
  let totalHarvestedKg = 0;
  let totalSoldKg = 0;
  let totalRevenueKes = 0;
  for (const h of harvests) {
    const harvestedKg = toNum(h.quantityKg);
    const soldKg = toNum(h.soldQuantityKg);
    const revenueKes = toNum(h.totalRevenueKes);
    totalHarvestedKg += harvestedKg;
    totalSoldKg += soldKg;
    totalRevenueKes += revenueKes;

    const entry = byCropMap.get(h.crop) ?? { cropName: h.crop, harvestedKg: 0, soldKg: 0, revenueKes: 0 };
    entry.harvestedKg += harvestedKg;
    entry.soldKg += soldKg;
    entry.revenueKes += revenueKes;
    byCropMap.set(h.crop, entry);
  }

  const byTypeMap = new Map<string, AnimalProductTotal>();
  for (const p of animalProducts) {
    const totalQty = toNum(p.quantity);
    const soldQty = toNum(p.soldQty);
    const revenueKes = soldQty * toNum(p.pricePerUnit);

    const entry =
      byTypeMap.get(p.productType) ?? { productType: p.productType, unit: p.unit, totalQty: 0, soldQty: 0, revenueKes: 0 };
    entry.totalQty += totalQty;
    entry.soldQty += soldQty;
    entry.revenueKes += revenueKes;
    byTypeMap.set(p.productType, entry);
  }

  const byCollectionTypeMap = new Map<string, CollectionTotal>();
  let totalSalesKes = 0;
  let paidKes = 0;
  let pendingKes = 0;
  for (const c of collections) {
    const amountKes = toNum(c.totalAmount);
    totalSalesKes += amountKes;
    if (c.isPaid) paidKes += amountKes;
    else pendingKes += amountKes;

    const entry =
      byCollectionTypeMap.get(c.productType) ?? { productType: c.productType, totalAmountKes: 0, totalQty: 0, unit: c.unit };
    entry.totalAmountKes += amountKes;
    entry.totalQty += toNum(c.quantity);
    byCollectionTypeMap.set(c.productType, entry);
  }

  return {
    cropHarvests: {
      totalHarvestedKg: round2(totalHarvestedKg),
      totalSoldKg: round2(totalSoldKg),
      totalRevenueKes: Math.round(totalRevenueKes),
      byCrop: [...byCropMap.values()].map((e) => ({ ...e, harvestedKg: round2(e.harvestedKg), soldKg: round2(e.soldKg), revenueKes: Math.round(e.revenueKes) })),
    },
    animalProducts: {
      byType: [...byTypeMap.values()].map((e) => ({ ...e, totalQty: round2(e.totalQty), soldQty: round2(e.soldQty), revenueKes: Math.round(e.revenueKes) })),
    },
    collections: {
      totalSalesKes: Math.round(totalSalesKes),
      paidKes: Math.round(paidKes),
      pendingKes: Math.round(pendingKes),
      byProductType: [...byCollectionTypeMap.values()].map((e) => ({ ...e, totalQty: round2(e.totalQty), totalAmountKes: Math.round(e.totalAmountKes) })),
    },
  };
}
