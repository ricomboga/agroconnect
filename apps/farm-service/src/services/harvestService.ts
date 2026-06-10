import * as harvestRepo from '../repositories/harvestRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { publishHarvestRecorded } from '../events/producers/harvestRecordedProducer.js';
import { CreateHarvestDto } from '../schemas/createHarvest.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

async function assertFarmOwnership(farmId: string, ownerId: string) {
  const farm = await farmRepo.findFarmById(farmId, ownerId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
}

export async function recordHarvest(farmId: string, ownerId: string, dto: CreateHarvestDto) {
  await assertFarmOwnership(farmId, ownerId);
  const harvest = await harvestRepo.createHarvest(farmId, dto);
  await publishHarvestRecorded(harvest.id, farmId, ownerId, harvest.crop, Number(harvest.quantityKg));
  return harvest;
}

export async function listHarvests(farmId: string, ownerId: string, pagination: PaginationParams) {
  await assertFarmOwnership(farmId, ownerId);
  const [harvests, total] = await Promise.all([
    harvestRepo.findHarvestsByFarm(farmId, pagination),
    harvestRepo.countHarvestsByFarm(farmId),
  ]);
  return { harvests, total };
}
