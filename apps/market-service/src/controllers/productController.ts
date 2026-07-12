import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as productService from '../services/productService.js';
import { ListProductsQuery } from '../schemas/listProducts.query.schema.js';

/**
 * @openapi
 * /api/v1/market/products:
 *   get:
 *     summary: Browse supplier products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: county
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: page_size
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
export async function browseProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await productService.browseProducts(req.query as unknown as ListProductsQuery);
    res.json({ data: result.products, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/products/{productId}:
 *   get:
 *     summary: Get a single supplier product
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Product detail
 *       404:
 *         description: Product not found
 */
export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.getProduct(req.params['productId'] as string);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/products:
 *   post:
 *     summary: Create a supplier product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Role must be supplier
 */
export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.createProduct(req.user.id, req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/products/{productId}:
 *   patch:
 *     summary: Update a supplier product (owner only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Product not found
 */
export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.updateProduct(
      req.params['productId'] as string,
      req.user.id,
      req.body,
    );
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}
