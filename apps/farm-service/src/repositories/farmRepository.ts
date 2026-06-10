import { prisma } from '@agroconnect/db/farm';
import { CreateFarmDto } from '../schemas/createFarm.schema.js';
import { UpdateFarmDto } from '../schemas/updateFarm.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createFarm(ownerId: string, dto: CreateFarmDto) {
  return prisma.farm.create({
    data: { ...dto, ownerId },
  });
}

export async function findFarmsByOwner(ownerId: string, pagination: PaginationParams) {
  return prisma.farm.findMany({
    where: { ownerId, status: { not: 'sold' } },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { createdAt: 'desc' },
  });
}

export async function countFarmsByOwner(ownerId: string) {
  return prisma.farm.count({ where: { ownerId, status: { not: 'sold' } } });
}

export async function findFarmById(farmId: string, ownerId: string) {
  return prisma.farm.findFirst({
    where: { id: farmId, ownerId },
    include: { plots: true },
  });
}

export async function updateFarm(farmId: string, ownerId: string, dto: UpdateFarmDto) {
  return prisma.farm.updateMany({
    where: { id: farmId, ownerId },
    data: dto,
  });
}

export async function softDeleteFarm(farmId: string, ownerId: string) {
  return prisma.farm.updateMany({
    where: { id: farmId, ownerId },
    data: { status: 'sold' },
  });
}
