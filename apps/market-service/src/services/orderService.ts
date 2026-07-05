import * as orderRepo from '../repositories/orderRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import { publishOrderPlaced } from '../events/producers/orderPlacedProducer.js';
import { publishOrderUpdated } from '../events/producers/orderUpdatedProducer.js';
import { createError } from '../middleware/errorHandler.js';
import { parsePaginationParams, buildMeta } from '../utils/pagination.js';
import { CreateOrderDto } from '../schemas/createOrder.schema.js';
import { UpdateOrderStatusDto } from '../schemas/updateOrderStatus.schema.js';
import { ListOrdersQuery } from '../schemas/listOrders.query.schema.js';
import { ListCustomersQuery } from '../schemas/listCustomers.query.schema.js';

const VALID_TRANSITIONS: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'dispatched',
  dispatched: 'delivered',
};

export async function placeOrder(buyerId: string, dto: CreateOrderDto) {
  const product = await productRepo.findProductById(dto.productId);
  if (!product) throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  if (!product.isActive) throw createError('Product is not available', 422, 'PRODUCT_UNAVAILABLE');

  const stockQuantity = Number(product.stockQuantity);
  if (stockQuantity < dto.quantityUnits) {
    throw createError(
      `Insufficient stock. Available: ${stockQuantity} ${product.unit}`,
      422,
      'INSUFFICIENT_STOCK',
    );
  }

  const unitPriceKes = Number(product.pricePerUnitKes);
  const totalPriceKes = dto.quantityUnits * unitPriceKes;

  const order = await orderRepo.createOrder({
    buyerId,
    supplierId: product.supplierId,
    productId: dto.productId,
    quantityUnits: dto.quantityUnits,
    unitPriceKes,
    totalPriceKes,
    deliveryAddress: dto.deliveryAddress,
    notes: dto.notes,
  });

  await publishOrderPlaced(order.id, buyerId, product.supplierId, totalPriceKes);
  return order;
}

export async function listOrders(userId: string, role: string, query: ListOrdersQuery) {
  const pagination = parsePaginationParams(query as Record<string, unknown>);
  const [orders, total] = await Promise.all([
    orderRepo.findOrders(userId, role, query, pagination),
    orderRepo.countOrders(userId, role, query),
  ]);
  return { orders, meta: buildMeta(query as Record<string, unknown>, pagination, total) };
}

export async function updateOrderStatus(
  orderId: string,
  userId: string,
  role: string,
  dto: UpdateOrderStatusDto,
) {
  if (role !== 'supplier') {
    throw createError('Only suppliers can update order status', 403, 'FORBIDDEN');
  }

  const order = await orderRepo.findOrderById(orderId);
  if (!order) throw createError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (order.supplierId !== userId) throw createError('Forbidden', 403, 'FORBIDDEN');

  const expectedNext = VALID_TRANSITIONS[order.status];
  if (expectedNext !== dto.status) {
    throw createError(
      `Invalid transition: ${order.status} → ${dto.status}. Expected next: ${String(expectedNext)}`,
      422,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await orderRepo.updateOrderStatus(orderId, dto.status);
  await publishOrderUpdated(orderId, dto.status, userId);
  return updated;
}

/**
 * Orders scoped to the authenticated supplier's own products.
 *
 * NOTE: `Order` in this schema carries a single `supplierId` per order (no
 * multi-supplier line items — see packages/db/prisma/market/schema.prisma),
 * so "orders containing at least one line item for a product owned by the
 * supplier" reduces to a direct `supplierId` match. This reuses the same
 * `findOrders`/`countOrders` repo functions the generic `/orders` list uses,
 * forcing role to 'supplier' regardless of the caller's actual role so an
 * admin hitting this "me"-scoped endpoint still only sees their own id's
 * orders (there is no supplier identity for admin callers here).
 */
export async function listSupplierOrders(supplierId: string, query: ListOrdersQuery) {
  const pagination = parsePaginationParams(query as Record<string, unknown>);
  const [orders, total] = await Promise.all([
    orderRepo.findOrders(supplierId, 'supplier', query, pagination),
    orderRepo.countOrders(supplierId, 'supplier', query),
  ]);
  return { orders, meta: buildMeta(query as Record<string, unknown>, pagination, total) };
}

export interface SupplierCustomerSummary {
  buyerId: string;
  orderCount: number;
  totalSpentKes: number;
  lastOrderAt: Date;
}

/**
 * Per-customer aggregate for the authenticated supplier: order count, total
 * spent, and last order date, grouped by buyer. Because every `Order` row
 * already belongs to exactly one supplier (see note above), `totalSpentKes`
 * is the exact amount attributable to this supplier — there is no
 * multi-supplier order total to apportion. Computed via `prisma.groupBy`
 * (no raw SQL), bounded/paginated via take+skip.
 */
export async function getSupplierCustomers(supplierId: string, query: ListCustomersQuery) {
  const pagination = parsePaginationParams(query as Record<string, unknown>);
  const [customers, total] = await Promise.all([
    orderRepo.groupCustomersBySupplier(supplierId, pagination),
    orderRepo.countDistinctCustomersForSupplier(supplierId),
  ]);
  return { customers, meta: buildMeta(query as Record<string, unknown>, pagination, total) };
}
