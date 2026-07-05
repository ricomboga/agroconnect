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
