import { prisma } from '@agroconnect/db/farm';
import { CreateFarmDto } from '../schemas/createFarm.schema.js';
import { UpdateFarmDto } from '../schemas/updateFarm.schema.js';
import { PaginationParams } from '../types/index.js';

const notDeleted = { deletedAt: null };

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getFarmStats(farmIds: string[]) {
  if (farmIds.length === 0) return {};
  const today = todayMidnight();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [overdueCounts, workerCounts, monthCounts] = await Promise.all([
    prisma.activity.groupBy({
      by: ['farmId'],
      where: { farmId: { in: farmIds }, status: 'pending', scheduledDate: { lt: today } },
      _count: { id: true },
    }),
    prisma.farmWorker.groupBy({
      by: ['farmId'],
      where: { farmId: { in: farmIds }, isActive: true },
      _count: { id: true },
    }),
    prisma.activity.groupBy({
      by: ['farmId'],
      where: {
        farmId: { in: farmIds },
        status: { not: 'skipped' },
        scheduledDate: { gte: monthStart, lt: monthEnd },
      },
      _count: { id: true },
    }),
  ]);

  const statsMap: Record<string, { overdueCount: number; workerCount: number; activitiesThisMonth: number; healthScore: number }> = {};
  for (const id of farmIds) {
    const overdue = overdueCounts.find((r) => r.farmId === id)?._count.id ?? 0;
    const workers = workerCounts.find((r) => r.farmId === id)?._count.id ?? 0;
    const monthActs = monthCounts.find((r) => r.farmId === id)?._count.id ?? 0;
    const health = Math.max(0, 100 - overdue * 15);
    statsMap[id] = { overdueCount: overdue, workerCount: workers, activitiesThisMonth: monthActs, healthScore: health };
  }
  return statsMap;
}

export async function createFarm(ownerId: string, dto: Omit<CreateFarmDto, 'firstCrop' | 'firstCropVariety' | 'plantingDate'>) {
  return prisma.farm.create({
    data: { ...dto, ownerId },
  });
}

export interface FarmListFilters {
  search?: string;
  county?: string;
}

function farmListWhere(ownerId: string | undefined, filters: FarmListFilters = {}) {
  return {
    ...(ownerId !== undefined ? { ownerId } : {}),
    ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' as const } } : {}),
    ...(filters.county ? { county: filters.county } : {}),
    ...notDeleted,
  };
}

export async function findFarmsByOwner(
  ownerId: string | undefined,
  pagination: PaginationParams,
  filters: FarmListFilters = {},
) {
  return prisma.farm.findMany({
    where: farmListWhere(ownerId, filters),
    take: pagination.take,
    skip: pagination.skip,
    include: { plots: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countFarmsByOwner(ownerId: string | undefined, filters: FarmListFilters = {}) {
  return prisma.farm.count({
    where: farmListWhere(ownerId, filters),
  });
}

export async function findFarmsByOwners(ownerIds: string[]) {
  return prisma.farm.findMany({
    where: { ownerId: { in: ownerIds }, deletedAt: null },
    select: { ownerId: true, county: true, subCounty: true, areaAcres: true, farmType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findFarmsByCounties(counties: string[]) {
  return prisma.farm.findMany({
    where: { county: { in: counties }, deletedAt: null },
    select: { ownerId: true, county: true, subCounty: true, areaAcres: true, farmType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
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
