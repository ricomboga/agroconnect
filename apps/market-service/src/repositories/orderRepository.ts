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
