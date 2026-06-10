import { prisma } from '@agroconnect/db/farm';
import { CreatePlotDto } from '../schemas/createPlot.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createPlot(farmId: string, dto: CreatePlotDto) {
  return prisma.farmPlot.create({
    data: { farmId, ...dto },
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
