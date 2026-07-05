import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@agroconnect/db/farm';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// ── Zod schemas ────────────────────────────────────────────────────────────────

const restockSchema = z.object({
  itemId:       z.string(),
  qtyAdded:     z.number().positive(),
  costPerUnit:  z.number().min(0),
  purchaseDate: z.string().date(),
  supplier:     z.string().min(1),
});

const recordUseSchema = z.object({
  itemId:     z.string(),
  qtyUsed:    z.number().positive(),
  usedDate:   z.string().date(),
  activityId: z.string().optional(),
  notes:      z.string().optional(),
});

const animalProductSchema = z.object({
  productType:   z.string().trim().min(1).max(40),
  quantity:      z.number().positive(),
  date:          z.string().date(),
  farmId:        z.string(),
  animalGroupId: z.string(),
  pricePerUnit:  z.number().min(0),
  unit:          z.string().min(1).optional(),
});

const updateAnimalProductSchema = z.object({
  quantity: z.number().positive(),
  notes:    z.string().optional(),
});

const harvestStoreSchema = z.object({
  farmId:          z.string(),
  cropName:        z.string().min(1),
  variety:         z.string().optional(),
  harvestDate:     z.string().date(),
  quantityKg:      z.number().positive(),
  gradeLabel:      z.string(),
  storageLocation: z.string().min(1),
});

const harvestSaleSchema = z.object({
  harvestId:  z.string(),
  soldKg:     z.number().positive(),
  pricePerKg: z.number().positive(),
  buyerName:  z.string().optional(),
  saleDate:   z.string().date(),
});

const updateHarvestStockSchema = z.object({
  harvestId:      z.string(),
  newRemainingKg: z.number().min(0),
  notes:          z.string().optional(),
});

const collectionSchema = z.object({
  customerName:  z.string().min(1),
  customerPhone: z.string().optional(),
  productType:   z.string(),
  quantity:      z.number().positive(),
  unit:          z.string(),
  pricePerUnit:  z.number().min(0),
  totalAmount:   z.number().min(0),
  takenDate:     z.string().date(),
  farmId:        z.string(),
  notes:         z.string().optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function validate<T>(schema: z.ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', issues: result.error.issues } });
    return null;
  }
  return result.data;
}

async function ownedFarmIds(userId: string): Promise<string[]> {
  const farms = await prisma.farm.findMany({ where: { ownerId: userId, deletedAt: null }, select: { id: true } });
  return farms.map((f) => f.id);
}

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

// Default unit per known product type — farmers can also send their own `unit`
// (e.g. for a custom-typed product like "rabbit") which always takes priority.
const DEFAULT_UNIT_BY_PRODUCT_TYPE: Record<string, string> = {
  eggs:      'trays',
  cow_milk:  'litres',
  goat_milk: 'litres',
  milk:      'litres', // legacy records predating the cow/goat split
  fish:      'kg',
  honey:     'kg',
  wool:      'kg',
};

function unitForProductType(productType: string, explicitUnit?: string): string {
  return explicitUnit ?? DEFAULT_UNIT_BY_PRODUCT_TYPE[productType] ?? 'units';
}

// ── Inputs / Stock ─────────────────────────────────────────────────────────────

router.get('/inputs', auth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const farmId = authReq.query['farmId'] as string | undefined;
  const farmIds = farmId ? [farmId] : await ownedFarmIds(authReq.user.id);
  const items = await prisma.inventoryItem.findMany({ where: { farmId: { in: farmIds } }, orderBy: { createdAt: 'desc' } });
  res.json({
    data: items.map((i) => {
      const remainingQty = toNum(i.purchasedQty) - toNum(i.usedQty);
      const reorderThreshold = toNum(i.totalPurchasedQty) * 0.2;
      return {
        id: i.id,
        farmId: i.farmId,
        name: i.name,
        category: i.category,
        emoji: i.emoji,
        unit: i.unit,
        purchasedQty: toNum(i.purchasedQty),
        usedQty: toNum(i.usedQty),
        remainingQty,
        totalPurchasedQty: toNum(i.totalPurchasedQty),
        costPerUnit: toNum(i.costPerUnit),
        supplier: i.supplier,
        lastUsedDate: i.lastUsedDate ? i.lastUsedDate.toISOString().split('T')[0] : null,
        reorderAlert: remainingQty <= reorderThreshold,
        scheduledUseDate: i.scheduledUseDate ? i.scheduledUseDate.toISOString().split('T')[0] : null,
        notes: i.notes ?? '',
      };
    }),
  });
});

router.post('/inputs/:id/restock', auth, async (req: Request, res: Response) => {
  const dto = validate(restockSchema, { ...req.body, itemId: req.params['id'] }, res);
  if (!dto) return;
  const item = await prisma.inventoryItem.update({
    where: { id: dto.itemId },
    data: {
      purchasedQty:      { increment: dto.qtyAdded },
      totalPurchasedQty: { increment: dto.qtyAdded },
      costPerUnit:       dto.costPerUnit,
      supplier:          dto.supplier,
    },
  });
  logger.info({ context: 'inventory', action: 'restock', dto }, 'inventory restock recorded');
  res.status(201).json({ data: { ...dto, remainingQty: toNum(item.purchasedQty) - toNum(item.usedQty) } });
});

router.post('/inputs/:id/use', auth, async (req: Request, res: Response) => {
  const dto = validate(recordUseSchema, { ...req.body, itemId: req.params['id'] }, res);
  if (!dto) return;
  await prisma.inventoryItem.update({
    where: { id: dto.itemId },
    data: {
      usedQty:      { increment: dto.qtyUsed },
      lastUsedDate: new Date(dto.usedDate),
      notes:        dto.notes,
    },
  });
  logger.info({ context: 'inventory', action: 'record_use', dto }, 'inventory usage recorded');
  res.status(201).json({ data: dto });
});

// ── Animal products ────────────────────────────────────────────────────────────

router.get('/animal-products', auth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const farmId = authReq.query['farmId'] as string | undefined;
  const farmIds = farmId ? [farmId] : await ownedFarmIds(authReq.user.id);
  const records = await prisma.animalProductRecord.findMany({ where: { farmId: { in: farmIds } }, orderBy: { date: 'desc' } });
  res.json({
    data: records.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      productType: r.productType,
      quantity: toNum(r.quantity),
      unit: r.unit,
      farmId: r.farmId,
      animalGroupId: r.animalGroupId,
      soldQty: toNum(r.soldQty),
      pendingQty: toNum(r.quantity) - toNum(r.soldQty),
      pricePerUnit: toNum(r.pricePerUnit),
    })),
  });
});

router.post('/animal-products', auth, async (req: Request, res: Response) => {
  const dto = validate(animalProductSchema, req.body, res);
  if (!dto) return;
  const record = await prisma.animalProductRecord.create({
    data: {
      farmId:        dto.farmId,
      animalGroupId: dto.animalGroupId,
      date:          new Date(dto.date),
      productType:   dto.productType,
      quantity:      dto.quantity,
      unit:          unitForProductType(dto.productType, dto.unit),
      pricePerUnit:  dto.pricePerUnit,
    },
  });
  logger.info({ context: 'inventory', action: 'record_animal_product', dto }, 'animal product recorded');
  res.status(201).json({ data: { id: record.id, ...dto, soldQty: 0, pendingQty: dto.quantity } });
});

router.patch('/animal-products/:id', auth, async (req: Request, res: Response) => {
  const dto = validate(updateAnimalProductSchema, req.body, res);
  if (!dto) return;
  await prisma.animalProductRecord.update({
    where: { id: req.params['id'] as string },
    data: { quantity: dto.quantity },
  });
  logger.info({ context: 'inventory', action: 'update_animal_product', id: req.params['id'], dto }, 'animal product updated');
  res.json({ data: { id: req.params['id'], ...dto } });
});

// ── Harvest store ──────────────────────────────────────────────────────────────

router.get('/harvest-store', auth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const farmId = authReq.query['farmId'] as string | undefined;
  const farmIds = farmId ? [farmId] : await ownedFarmIds(authReq.user.id);
  const harvests = await prisma.harvest.findMany({ where: { farmId: { in: farmIds } }, orderBy: { harvestDate: 'desc' } });
  res.json({
    data: harvests.map((h) => {
      const quantityKg = toNum(h.quantityKg);
      const soldKg = toNum(h.soldQuantityKg);
      const remainingKg = quantityKg - soldKg;
      return {
        id: h.id,
        farmId: h.farmId,
        cropName: h.crop,
        variety: h.variety ?? '',
        harvestDate: h.harvestDate.toISOString().split('T')[0],
        quantityKg,
        soldKg,
        remainingKg,
        gradeLabel: h.qualityGrade ?? '',
        storageLocation: h.storageLocation ?? '',
        estimatedValueKes: Math.round(remainingKg * toNum(h.avgPriceKes)),
      };
    }),
  });
});

router.post('/harvest-store', auth, async (req: Request, res: Response) => {
  const dto = validate(harvestStoreSchema, req.body, res);
  if (!dto) return;
  const harvest = await prisma.harvest.create({
    data: {
      farmId:          dto.farmId,
      crop:            dto.cropName,
      variety:         dto.variety,
      harvestDate:     new Date(dto.harvestDate),
      quantityKg:      dto.quantityKg,
      qualityGrade:    dto.gradeLabel as 'A' | 'B' | 'C' | 'reject',
      storageLocation: dto.storageLocation,
    },
  });
  logger.info({ context: 'inventory', action: 'add_harvest', dto }, 'harvest added to store');
  res.status(201).json({ data: { id: harvest.id, ...dto, soldKg: 0, remainingKg: dto.quantityKg, estimatedValueKes: 0 } });
});

router.post('/harvest-store/:id/sell', auth, async (req: Request, res: Response) => {
  const dto = validate(harvestSaleSchema, { ...req.body, harvestId: req.params['id'] }, res);
  if (!dto) return;
  await prisma.harvest.update({
    where: { id: dto.harvestId },
    data: {
      soldQuantityKg:  { increment: dto.soldKg },
      avgPriceKes:     dto.pricePerKg,
      totalRevenueKes: { increment: dto.soldKg * dto.pricePerKg },
    },
  });
  logger.info({ context: 'inventory', action: 'harvest_sale', dto }, 'harvest sale recorded');
  res.status(201).json({ data: dto });
});

router.patch('/harvest-store/:id/stock', auth, async (req: Request, res: Response) => {
  const dto = validate(updateHarvestStockSchema, { ...req.body, harvestId: req.params['id'] }, res);
  if (!dto) return;
  const harvest = await prisma.harvest.findUniqueOrThrow({ where: { id: dto.harvestId } });
  const soldQuantityKg = toNum(harvest.quantityKg) - dto.newRemainingKg;
  await prisma.harvest.update({
    where: { id: dto.harvestId },
    data: { soldQuantityKg, notes: dto.notes },
  });
  logger.info({ context: 'inventory', action: 'update_harvest_stock', dto }, 'harvest stock updated');
  res.json({ data: dto });
});

// ── Collections ────────────────────────────────────────────────────────────────

router.get('/collections', auth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const farmId = authReq.query['farmId'] as string | undefined;
  const farmIds = farmId ? [farmId] : await ownedFarmIds(authReq.user.id);
  const collections = await prisma.customerCollection.findMany({ where: { farmId: { in: farmIds } }, orderBy: { takenDate: 'desc' } });
  res.json({
    data: collections.map((c) => ({
      id: c.id,
      customerName: c.customerName,
      customerPhone: c.customerPhone ?? '',
      productType: c.productType,
      quantity: toNum(c.quantity),
      unit: c.unit,
      pricePerUnit: toNum(c.pricePerUnit),
      totalAmount: toNum(c.totalAmount),
      takenDate: c.takenDate.toISOString().split('T')[0],
      paidDate: c.paidDate ? c.paidDate.toISOString().split('T')[0] : null,
      isPaid: c.isPaid,
      farmId: c.farmId,
      notes: c.notes ?? '',
    })),
  });
});

router.post('/collections', auth, async (req: Request, res: Response) => {
  const dto = validate(collectionSchema, req.body, res);
  if (!dto) return;
  const collection = await prisma.customerCollection.create({
    data: {
      farmId:        dto.farmId,
      customerName:  dto.customerName,
      customerPhone: dto.customerPhone,
      productType:   dto.productType,
      quantity:      dto.quantity,
      unit:          dto.unit,
      pricePerUnit:  dto.pricePerUnit,
      totalAmount:   dto.totalAmount,
      takenDate:     new Date(dto.takenDate),
      notes:         dto.notes,
    },
  });
  logger.info({ context: 'inventory', action: 'add_collection', dto }, 'customer collection recorded');
  res.status(201).json({ data: { id: collection.id, ...dto, isPaid: false, paidDate: null } });
});

router.patch('/collections/:id/pay', auth, async (req: Request, res: Response) => {
  const paidDate = new Date();
  await prisma.customerCollection.update({
    where: { id: req.params['id'] as string },
    data: { isPaid: true, paidDate },
  });
  logger.info({ context: 'inventory', action: 'mark_paid', id: req.params['id'] }, 'collection marked paid');
  res.json({ data: { id: req.params['id'], isPaid: true, paidDate: paidDate.toISOString().split('T')[0] } });
});

// ── Summary ────────────────────────────────────────────────────────────────────

router.get('/summary', auth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const farmIds = await ownedFarmIds(authReq.user.id);

  const todayDate = new Date(new Date().toISOString().split('T')[0]);

  const [items, collections, harvests, todayProducts] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { farmId: { in: farmIds } } }),
    prisma.customerCollection.findMany({ where: { farmId: { in: farmIds }, isPaid: false } }),
    prisma.harvest.findMany({ where: { farmId: { in: farmIds } } }),
    prisma.animalProductRecord.groupBy({
      by: ['productType'],
      where: { farmId: { in: farmIds }, date: { equals: todayDate } },
      _sum: { quantity: true },
    }),
  ]);

  let totalItemsLow = 0;
  let totalItemsEmpty = 0;
  for (const i of items) {
    const remaining = toNum(i.purchasedQty) - toNum(i.usedQty);
    const total = toNum(i.totalPurchasedQty);
    if (remaining <= 0) totalItemsEmpty += 1;
    else if (total > 0 && remaining <= total * 0.2) totalItemsLow += 1;
  }

  const totalPendingCollectionsKes = collections.reduce((sum, c) => sum + toNum(c.totalAmount), 0);
  const totalHarvestInStoreKes = harvests.reduce((sum, h) => {
    const remainingKg = toNum(h.quantityKg) - toNum(h.soldQuantityKg);
    return sum + remainingKg * toNum(h.avgPriceKes);
  }, 0);

  res.json({
    data: {
      totalItemsLow,
      totalItemsEmpty,
      totalPendingCollectionsKes: Math.round(totalPendingCollectionsKes),
      totalHarvestInStoreKes: Math.round(totalHarvestInStoreKes),
      animalProductsToday: todayProducts
        .filter((p) => toNum(p._sum.quantity) > 0)
        .map((p) => ({ productType: p.productType, quantity: toNum(p._sum.quantity) })),
    },
  });
});

export { router as inventoryRouter };
