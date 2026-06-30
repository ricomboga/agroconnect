import { prisma, Prisma } from '@agroconnect/db/farm';
import { CreatePlotDto } from '../schemas/createPlot.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createPlot(farmId: string, dto: CreatePlotDto) {
  const { polygonGeojson, ...rest } = dto;
  return prisma.farmPlot.create({
    data: {
      farmId,
      ...rest,
      ...(polygonGeojson !== undefined
        ? { polygonGeojson: polygonGeojson as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function findPlotsByFarm(farmId: string, pagination: PaginationParams) {
  return prisma.farmPlot.findMany({
    where: { farmId },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { name: 'asc' },
  });
}

export async function countPlotsByFarm(farmId: string) {
  return prisma.farmPlot.count({ where: { farmId } });
}

export async function findPlotById(plotId: string, farmId: string) {
  return prisma.farmPlot.findFirst({ where: { id: plotId, farmId } });
}

export async function updatePlotCrop(
  plotId: string,
  _farmId: string,
  crop: string,
  variety: string | undefined,
  plantingDate: Date,
) {
  return prisma.farmPlot.update({
    where: { id: plotId },
    data: {
      currentCrop: crop,
      cropVariety: variety ?? null,
      plantingDate,
      currentCropPlantedAt: plantingDate,
    },
  });
}
