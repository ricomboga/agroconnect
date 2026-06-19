import { prisma } from '@agroconnect/db/market';
import { PaginationParams } from '../types/index.js';
import { CreateProductDto } from '../schemas/createProduct.schema.js';
import { UpdateProductDto } from '../schemas/updateProduct.schema.js';
import { ListProductsQuery } from '../schemas/listProducts.query.schema.js';

export async function createProduct(supplierId: string, dto: CreateProductDto) {
  return prisma.supplierProduct.create({
    data: {
      supplierId,
      name: dto.name,
      category: dto.category,
      brand: dto.brand ?? null,
      description: dto.description,
      unit: dto.unit,
      pricePerUnitKes: dto.pricePerUnitKes,
      stockQuantity: dto.stockQuantity,
      sku: dto.sku ?? null,
      countyAvailability: dto.countyAvailability,
      photos: dto.photos ?? [],
    },
  });
}

function buildProductsWhere(query: ListProductsQuery) {
  const where: Record<string, unknown> = { isActive: true };
  if (query.category) where['category'] = query.category;
  if (query.county) {
    where['countyAvailability'] = { array_contains: [query.county] };
  }
  return where;
}

export async function findProducts(query: ListProductsQuery, pagination: PaginationParams) {
  return prisma.supplierProduct.findMany({
    where: buildProductsWhere(query),
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { createdAt: 'desc' },
  });
}

export async function countProducts(query: ListProductsQuery) {
  return prisma.supplierProduct.count({ where: buildProductsWhere(query) });
}

export async function findProductById(productId: string) {
  return prisma.supplierProduct.findUnique({ where: { id: productId } });
}

export async function updateProduct(productId: string, dto: UpdateProductDto) {
  return prisma.supplierProduct.update({
    where: { id: productId },
    data: dto,
  });
}
