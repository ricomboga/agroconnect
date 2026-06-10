import * as farmRepo from '../repositories/farmRepository.js';
import { publishFarmCreated } from '../events/producers/farmCreatedProducer.js';
import { CreateFarmDto } from '../schemas/createFarm.schema.js';
import { UpdateFarmDto } from '../schemas/updateFarm.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function createFarm(ownerId: string, dto: CreateFarmDto) {
  const farm = await farmRepo.createFarm(ownerId, dto);
  await publishFarmCreated(farm.id, ownerId, farm.county);
  return farm;
}

export async function listFarms(ownerId: string, pagination: PaginationParams) {
  const [farms, total] = await Promise.all([
    farmRepo.findFarmsByOwner(ownerId, pagination),
    farmRepo.countFarmsByOwner(ownerId),
  ]);
  return { farms, total };
}

export async function getFarm(farmId: string, ownerId: string) {
  const farm = await farmRepo.findFarmById(farmId, ownerId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farm;
}

export async function updateFarm(farmId: string, ownerId: string, dto: UpdateFarmDto) {
  await getFarm(farmId, ownerId);
  const result = await farmRepo.updateFarm(farmId, ownerId, dto);
  if (result.count === 0) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farmRepo.findFarmById(farmId, ownerId);
}

export async function deleteFarm(farmId: string, ownerId: string) {
  await getFarm(farmId, ownerId);
  await farmRepo.softDeleteFarm(farmId, ownerId);
}
