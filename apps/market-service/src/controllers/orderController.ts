import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as orderService from '../services/orderService.js';
import { ListOrdersQuery } from '../schemas/listOrders.query.schema.js';

/**
 * @openapi
 * /api/v1/market/orders:
 *   post:
 *     summary: Place an order for a supplier product
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order placed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Product not found
 *       422:
 *         description: Insufficient stock or product unavailable
 */
export async function placeOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await orderService.placeOrder(req.user.id, req.body);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/orders:
 *   get:
 *     summary: List orders (filtered by caller role)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *       401:
 *         description: Missing or invalid JWT
 */
export async function listOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.listOrders(
      req.user.id,
      req.user.role,
      req.query as unknown as ListOrdersQuery,
    );
    res.json({ data: result.orders, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/orders/{orderId}/status:
 *   patch:
 *     summary: Advance order status (supplier only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order status updated
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Caller is not a supplier or not the supplying party
 *       404:
 *         description: Order not found
 *       422:
 *         description: Invalid status transition
 */
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await orderService.updateOrderStatus(
      req.params['orderId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}
