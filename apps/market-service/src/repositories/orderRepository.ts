import { prisma } from '@agroconnect/db/market';
import { PaginationParams } from '../types/index.js';
import { ListOrdersQuery } from '../schemas/listOrders.query.schema.js';

export interface CreateOrderData {
  buyerId: string;
  supplierId: string;
  productId: string;
  quantityUnits: number;
  unitPriceKes: number;
  totalPriceKes: number;
  deliveryAddress: string;
  notes?: string;
}

export async function createOrder(data: CreateOrderData) {
  return prisma.order.create({ data });
}

function buildOrdersWhere(userId: string, role: string, query: ListOrdersQuery) {
  const where: Record<string, unknown> = {};
  if (role === 'buyer') where['buyerId'] = userId;
  else if (role === 'supplier') where['supplierId'] = userId;
  if (query.status) where['status'] = query.status;
  return where;
}

export async function findOrders(userId: string, role: string, query: ListOrdersQuery, pagination: PaginationParams) {
  return prisma.order.findMany({
    where: buildOrdersWhere(userId, role, query),
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { createdAt: 'desc' },
  });
}

export async function countOrders(userId: string, role: string, query: ListOrdersQuery) {
  return prisma.order.count({ where: buildOrdersWhere(userId, role, query) });
}

export async function findOrderById(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId } });
}

export async function updateOrderStatus(orderId: string, status: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status: status as 'confirmed' | 'dispatched' | 'delivered' },
  });
}

// Bounded scan used only to derive a distinct-customer total for pagination meta.
// The `orders` table is owned by this service and every row carries a single
// `supplierId` (no multi-supplier line items in this schema — see schema.prisma),
// so this is already scoped to "this supplier's orders" and cannot scan the whole
// table; the cap below is an extra safety bound against a single supplier with an
// extreme number of distinct buyers.
const MAX_DISTINCT_CUSTOMERS_SCAN = 5000;

export async function countDistinctCustomersForSupplier(supplierId: string): Promise<number> {
  const rows = await prisma.order.findMany({
    where: { supplierId },
    distinct: ['buyerId'],
    select: { buyerId: true },
    take: MAX_DISTINCT_CUSTOMERS_SCAN,
  });
  return rows.length;
}

export interface SupplierCustomerAggregate {
  buyerId: string;
  orderCount: number;
  totalSpentKes: number;
  lastOrderAt: Date;
}

interface RawSupplierCustomerGroup {
  buyerId: string;
  _count: { _all: number };
  _sum: { totalPriceKes: unknown };
  _max: { createdAt: Date | null };
}

export async function groupCustomersBySupplier(
  supplierId: string,
  pagination: PaginationParams,
): Promise<SupplierCustomerAggregate[]> {
  const rawGroups = await prisma.order.groupBy({
    by: ['buyerId'],
    where: { supplierId },
    _count: { _all: true },
    _sum: { totalPriceKes: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
    take: pagination.take,
    skip: pagination.skip,
  });
  const groups = rawGroups as unknown as RawSupplierCustomerGroup[];

  return groups.map((group) => ({
    buyerId: group.buyerId,
    orderCount: group._count._all,
    totalSpentKes: Number(group._sum.totalPriceKes ?? 0),
    lastOrderAt: group._max.createdAt as Date,
  }));
}

// Orders in these statuses represent an accepted sale (the supplier has
// committed to fulfilling it) — 'pending' orders are not yet a real sale and
// must not count toward revenue/top-product figures.
const REVENUE_STATUSES = ['confirmed', 'dispatched', 'delivered'];

// Safety bound mirroring MAX_DISTINCT_CUSTOMERS_SCAN above — this endpoint
// only ever needs a 6-month window for one supplier, but caps the scan in
// case of an outlier supplier with an extreme order volume.
const MAX_REVENUE_ORDERS_SCAN = 20000;

export interface ProductRevenueAggregate {
  productId: string;
  unitsSold: number;
  totalKes: number;
}

export interface SupplierRevenueSummary {
  revenueMonthKes: number;
  revenueTrend: { month: string; totalKes: number }[];
  topProducts: ProductRevenueAggregate[];
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

export async function getSupplierRevenueSummary(supplierId: string): Promise<SupplierRevenueSummary> {
  const now = new Date();
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const orders = await prisma.order.findMany({
    where: {
      supplierId,
      status: { in: REVENUE_STATUSES as unknown as ('confirmed' | 'dispatched' | 'delivered')[] },
      createdAt: { gte: sixMonthsAgo },
    },
    select: { productId: true, totalPriceKes: true, quantityUnits: true, createdAt: true },
    take: MAX_REVENUE_ORDERS_SCAN,
  });

  const monthBuckets = new Map<string, { label: string; totalKes: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthBuckets.set(monthKey(d), { label: monthLabel(d), totalKes: 0 });
  }

  const productTotals = new Map<string, { unitsSold: number; totalKes: number }>();
  const currentMonthKey = monthKey(now);
  let revenueMonthKes = 0;

  for (const order of orders) {
    const amount = Number(order.totalPriceKes);
    const key = monthKey(order.createdAt);
    const bucket = monthBuckets.get(key);
    if (bucket) bucket.totalKes += amount;
    if (key === currentMonthKey) revenueMonthKes += amount;

    const productTotal = productTotals.get(order.productId) ?? { unitsSold: 0, totalKes: 0 };
    productTotal.unitsSold += Number(order.quantityUnits);
    productTotal.totalKes += amount;
    productTotals.set(order.productId, productTotal);
  }

  const revenueTrend = Array.from(monthBuckets.values()).map((b) => ({
    month: b.label,
    totalKes: Math.round(b.totalKes),
  }));

  const topProducts = Array.from(productTotals.entries())
    .map(([productId, agg]) => ({ productId, unitsSold: agg.unitsSold, totalKes: Math.round(agg.totalKes) }))
    .sort((a, b) => b.totalKes - a.totalKes)
    .slice(0, 4);

  return { revenueMonthKes: Math.round(revenueMonthKes), revenueTrend, topProducts };
}
