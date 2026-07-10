import * as productRepo from '../repositories/productRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { parsePaginationParams, buildMeta } from '../utils/pagination.js';
import { CreateProductDto } from '../schemas/createProduct.schema.js';
import { UpdateProductDto } from '../schemas/updateProduct.schema.js';
import { ListProductsQuery } from '../schemas/listProducts.query.schema.js';
import { SupplierSummaryQuery } from '../schemas/supplierSummary.query.schema.js';

// Upper bound on how many low-stock items are ever returned inline in the
// summary payload, independent of how many actually match the threshold.
const MAX_LOW_STOCK_ITEMS = 50;

export async function browseProducts(query: ListProductsQuery) {
  const pagination = parsePaginationParams(query as Record<string, unknown>);
  const [products, total] = await Promise.all([
    productRepo.findProducts(query, pagination),
    productRepo.countProducts(query),
  ]);
  return { products, meta: buildMeta(query as Record<string, unknown>, pagination, total) };
}

export async function createProduct(supplierId: string, dto: CreateProductDto) {
  return productRepo.createProduct(supplierId, dto);
}

export async function getProduct(productId: string) {
  const product = await productRepo.findProductById(productId);
  if (!product) throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  return product;
}

export async function updateProduct(productId: string, supplierId: string, dto: UpdateProductDto) {
  const product = await productRepo.findProductById(productId);
  if (!product) throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  if (product.supplierId !== supplierId) throw createError('Forbidden', 403, 'FORBIDDEN');
  return productRepo.updateProduct(productId, dto);
}

/**
 * KPI summary for the authenticated supplier's own catalogue: active product
 * count, low-stock count, and a bounded list of the actual low-stock items
 * (capped at MAX_LOW_STOCK_ITEMS). Derived entirely from existing
 * `SupplierProduct.stockQuantity` / `isActive` fields — no schema change
 * needed.
 */
export async function getSupplierSummary(supplierId: string, query: SupplierSummaryQuery) {
  const threshold = query.low_stock_threshold;
  const [activeProductCount, lowStockCount, lowStockItems] = await Promise.all([
    productRepo.countActiveProductsBySupplier(supplierId),
    productRepo.countLowStockProductsBySupplier(supplierId, threshold),
    productRepo.findLowStockProductsBySupplier(supplierId, threshold, MAX_LOW_STOCK_ITEMS),
  ]);
  return { activeProductCount, lowStockCount, lowStockItems };
}
