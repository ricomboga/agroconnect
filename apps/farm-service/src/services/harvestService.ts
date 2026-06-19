import * as harvestRepo from '../repositories/harvestRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { publishHarvestRecorded } from '../events/producers/harvestRecordedProducer.js';
import { CreateHarvestDto } from '../schemas/createHarvest.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

async function assertFarmAccess(farmId: string, ownerId: string, role: string) {
  const ownedBy = role === 'admin' ? undefined : ownerId;
  const farm = await farmRepo.findFarmById(farmId, ownedBy);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
}

export async function recordHarvest(
  farmId: string,
  ownerId: string,
  role: string,
  dto: CreateHarvestDto,
) {
  await assertFarmAccess(farmId, ownerId, role);
  const harvest = await harvestRepo.createHarvest(farmId, dto);
  await publishHarvestRecorded(
    harvest.id,
    farmId,
    ownerId,
    harvest.crop,
    Number(harvest.quantityKg),
  );
  return harvest;
}

export async function listHarvests(
  farmId: string,
  ownerId: string,
  role: string,
  pagination: PaginationParams,
) {
  await assertFarmAccess(farmId, ownerId, role);
  const [harvests, total] = await Promise.all([
    harvestRepo.findHarvestsByFarm(farmId, pagination),
    harvestRepo.countHarvestsByFarm(farmId),
  ]);
  return { harvests, total };
}
