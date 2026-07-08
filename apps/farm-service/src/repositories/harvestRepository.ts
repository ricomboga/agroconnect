import { prisma } from '@agroconnect/db/farm';
import { CreateHarvestDto } from '../schemas/createHarvest.schema.js';
import { UpdateHarvestDto } from '../schemas/updateHarvest.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createHarvest(farmId: string, dto: CreateHarvestDto) {
  return prisma.harvest.create({
    data: {
      farmId,
      plotId: dto.plotId,
      crop: dto.crop,
      variety: dto.variety,
      quantityKg: dto.quantityKg,
      qualityGrade: dto.qualityGrade,
      harvestDate: new Date(dto.harvestDate),
      storageLocation: dto.storageLocation,
      soldQuantityKg: dto.soldQuantityKg,
      avgPriceKes: dto.avgPriceKes,
      totalRevenueKes: dto.totalRevenueKes,
      notes: dto.notes,
    },
  });
}

export async function findHarvestsByFarm(farmId: string, pagination: PaginationParams) {
  return prisma.harvest.findMany({
    where: { farmId },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { harvestDate: 'desc' },
  });
}

export async function countHarvestsByFarm(farmId: string) {
  return prisma.harvest.count({ where: { farmId } });
}

export async function findHarvestById(harvestId: string, farmId: string) {
  return prisma.harvest.findFirst({ where: { id: harvestId, farmId } });
}

export async function updateHarvest(harvestId: string, farmId: string, dto: UpdateHarvestDto) {
  const { harvestDate, ...rest } = dto;
  return prisma.harvest.updateMany({
    where: { id: harvestId, farmId },
    data: {
      ...rest,
      ...(harvestDate ? { harvestDate: new Date(harvestDate) } : {}),
    },
  });
}

export async function deleteHarvest(harvestId: string, farmId: string) {
  return prisma.harvest.deleteMany({ where: { id: harvestId, farmId } });
}
