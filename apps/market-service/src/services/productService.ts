import * as productRepo from '../repositories/productRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { parsePaginationParams, buildMeta } from '../utils/pagination.js';
import { CreateProductDto } from '../schemas/createProduct.schema.js';
import { UpdateProductDto } from '../schemas/updateProduct.schema.js';
import { ListProductsQuery } from '../schemas/listProducts.query.schema.js';

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

export async function updateProduct(productId: string, supplierId: string, dto: UpdateProductDto) {
  const product = await productRepo.findProductById(productId);
  if (!product) throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  if (product.supplierId !== supplierId) throw createError('Forbidden', 403, 'FORBIDDEN');
  return productRepo.updateProduct(productId, dto);
}
