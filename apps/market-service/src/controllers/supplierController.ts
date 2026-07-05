import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as orderService from '../services/orderService.js';
import * as productService from '../services/productService.js';
import { ListOrdersQuery } from '../schemas/listOrders.query.schema.js';
import { ListCustomersQuery } from '../schemas/listCustomers.query.schema.js';
import { SupplierSummaryQuery } from '../schemas/supplierSummary.query.schema.js';

/**
 * @openapi
 * /api/v1/market/suppliers/me/orders:
 *   get:
 *     summary: List orders scoped to the authenticated supplier's own products
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Caller is not a supplier or admin
 */
export async function getMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.listSupplierOrders(req.user.id, req.query as unknown as ListOrdersQuery);
    res.json({ data: result.orders, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/suppliers/me/customers:
 *   get:
 *     summary: Per-customer order aggregate for the authenticated supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of customer aggregates
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Caller is not a supplier or admin
 */
export async function getMyCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.getSupplierCustomers(
      req.user.id,
      req.query as unknown as ListCustomersQuery,
    );
    res.json({ data: result.customers, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/suppliers/me/summary:
 *   get:
 *     summary: KPI summary (active product count, low-stock items) for the authenticated supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: low_stock_threshold
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Supplier KPI summary
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Caller is not a supplier or admin
 */
export async function getMySummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await productService.getSupplierSummary(
      req.user.id,
      req.query as unknown as SupplierSummaryQuery,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
