import { prisma } from '@agroconnect/db/farm';
import { CreateFarmDto } from '../schemas/createFarm.schema.js';
import { UpdateFarmDto } from '../schemas/updateFarm.schema.js';
import { PaginationParams } from '../types/index.js';

const notDeleted = { deletedAt: null };

export async function createFarm(ownerId: string, dto: Omit<CreateFarmDto, 'firstCrop' | 'firstCropVariety' | 'plantingDate'>) {
  return prisma.farm.create({
    data: { ...dto, ownerId },
  });
}

export async function findFarmsByOwner(ownerId: string | undefined, pagination: PaginationParams) {
  return prisma.farm.findMany({
    where: { ...(ownerId !== undefined ? { ownerId } : {}), ...notDeleted },
    take: pagination.take,
    skip: pagination.skip,
    include: { plots: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countFarmsByOwner(ownerId: string | undefined) {
  return prisma.farm.count({
    where: { ...(ownerId !== undefined ? { ownerId } : {}), ...notDeleted },
  });
}

export async function findFarmsByWorker(userId: string, pagination: PaginationParams) {
  return prisma.farm.findMany({
    where: {
      workers: { some: { userId, isActive: true } },
      ...notDeleted,
    },
    take: pagination.take,
    skip: pagination.skip,
    include: { plots: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countFarmsByWorker(userId: string) {
  return prisma.farm.count({
    where: {
      workers: { some: { userId, isActive: true } },
      ...notDeleted,
    },
  });
}

export async function findFarmById(farmId: string, ownerId?: string) {
  return prisma.farm.findFirst({
    where: { id: farmId, ...(ownerId !== undefined ? { ownerId } : {}), ...notDeleted },
    include: { plots: true },
  });
}

export async function updateFarm(farmId: string, ownerId: string | undefined, dto: UpdateFarmDto) {
  return prisma.farm.updateMany({
    where: { id: farmId, ...(ownerId !== undefined ? { ownerId } : {}), ...notDeleted },
    data: dto,
  });
}

export async function softDeleteFarm(farmId: string, ownerId: string | undefined) {
  return prisma.farm.updateMany({
    where: { id: farmId, ...(ownerId !== undefined ? { ownerId } : {}), ...notDeleted },
    data: { deletedAt: new Date() },
  });
}

export async function createPlotWithCrop(
  farmId: string,
  dto: { cropType: string; variety?: string; plantingDate: string; areaAcres?: number; plotNumber?: string },
) {
  return prisma.farmPlot.create({
    data: {
      farmId,
      name: dto.plotNumber ?? dto.cropType,
      areaAcres: dto.areaAcres ?? 1,
      currentCrop: dto.cropType,
      currentCropPlantedAt: new Date(dto.plantingDate),
      plantingDate: new Date(dto.plantingDate),
      cropVariety: dto.variety,
    },
  });
}

export async function createAnimalGroup(
  farmId: string,
  dto: { animalType: string; count: number; breed?: string; notes?: string },
) {
  return prisma.animalGroup.create({
    data: { farmId, ...dto },
  });
}

export async function listAnimalGroups(farmId: string) {
  return prisma.animalGroup.findMany({
    where: { farmId },
    orderBy: { createdAt: 'desc' },
  });
}
