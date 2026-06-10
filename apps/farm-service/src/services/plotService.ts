import * as plotRepo from '../repositories/plotRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { CreatePlotDto } from '../schemas/createPlot.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

async function assertFarmOwnership(farmId: string, ownerId: string) {
  const farm = await farmRepo.findFarmById(farmId, ownerId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
}

export async function createPlot(farmId: string, ownerId: string, dto: CreatePlotDto) {
  await assertFarmOwnership(farmId, ownerId);
  return plotRepo.createPlot(farmId, dto);
}

export async function listPlots(farmId: string, ownerId: string, pagination: PaginationParams) {
  await assertFarmOwnership(farmId, ownerId);
  const [plots, total] = await Promise.all([
    plotRepo.findPlotsByFarm(farmId, pagination),
    plotRepo.countPlotsByFarm(farmId),
  ]);
  return { plots, total };
}
