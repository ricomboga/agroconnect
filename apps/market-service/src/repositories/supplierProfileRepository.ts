import { prisma } from '@agroconnect/db/market';
import { CreateSupplierProfileDto } from '../schemas/createSupplierProfile.schema.js';
import { UpdateSupplierProfileDto } from '../schemas/updateSupplierProfile.schema.js';
import { PaginationParams } from '../types/index.js';

export interface SupplierProfileFilter {
  county?: string;
  subCounty?: string;
  /** When set, matches county against this list instead of the exact `county` field (region fallback). */
  counties?: string[];
  category?: string;
  userId?: string;
}

export async function upsertSupplierProfile(dto: CreateSupplierProfileDto) {
  return prisma.supplierProfile.upsert({
    where: { userId: dto.userId },
    create: {
      userId: dto.userId,
      businessName: dto.businessName,
      businessRegNumber: dto.businessRegNumber,
      deliveryRadiusKm: dto.deliveryRadiusKm,
      description: dto.description,
      county: dto.county,
      subCounty: dto.subCounty,
      categories: dto.categories,
      phone: dto.phone,
      address: dto.address,
    },
    update: {
      businessName: dto.businessName,
      businessRegNumber: dto.businessRegNumber,
      deliveryRadiusKm: dto.deliveryRadiusKm,
      description: dto.description,
      county: dto.county,
      subCounty: dto.subCounty,
      categories: dto.categories,
      phone: dto.phone,
      address: dto.address,
    },
  });
}

function buildWhere(filter: SupplierProfileFilter) {
  return {
    isActive: true,
    ...(filter.counties?.length
      ? { county: { in: filter.counties } }
      : filter.county
        ? { county: filter.county }
        : {}),
    ...(filter.subCounty ? { subCounty: filter.subCounty } : {}),
    ...(filter.category ? { categories: { array_contains: filter.category } } : {}),
    ...(filter.userId ? { userId: filter.userId } : {}),
  };
}

export async function findSupplierProfiles(filter: SupplierProfileFilter, pagination: PaginationParams) {
  return prisma.supplierProfile.findMany({
    where: buildWhere(filter),
    orderBy: { businessName: 'asc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countSupplierProfiles(filter: SupplierProfileFilter) {
  return prisma.supplierProfile.count({ where: buildWhere(filter) });
}

export async function findSupplierProfileById(id: string) {
  return prisma.supplierProfile.findFirst({ where: { id, isActive: true } });
}

export async function findSupplierProfileByUserId(userId: string) {
  return prisma.supplierProfile.findUnique({ where: { userId } });
}

export async function updateSupplierProfileByUserId(userId: string, dto: UpdateSupplierProfileDto) {
  return prisma.supplierProfile.update({ where: { userId }, data: dto });
}
