import * as farmRepo from '../repositories/farmRepository.js';
import { publishFarmCreated } from '../events/producers/farmCreatedProducer.js';
import { CreateFarmDto } from '../schemas/createFarm.schema.js';
import { UpdateFarmDto } from '../schemas/updateFarm.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

function ownerFilter(ownerId: string, role: string): string | undefined {
  return role === 'admin' ? undefined : ownerId;
}

export async function createFarm(ownerId: string, dto: CreateFarmDto) {
  const farm = await farmRepo.createFarm(ownerId, dto);
  await publishFarmCreated(farm.id, ownerId, farm.county);
  return farm;
}

export async function listFarms(ownerId: string, role: string, pagination: PaginationParams) {
  const filter = ownerFilter(ownerId, role);
  const [farms, total] = await Promise.all([
    farmRepo.findFarmsByOwner(filter, pagination),
    farmRepo.countFarmsByOwner(filter),
  ]);
  return { farms, total };
}

export async function getFarm(farmId: string, ownerId: string, role: string) {
  const farm = await farmRepo.findFarmById(farmId, ownerFilter(ownerId, role));
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farm;
}

export async function updateFarm(
  farmId: string,
  ownerId: string,
  role: string,
  dto: UpdateFarmDto,
) {
  await getFarm(farmId, ownerId, role);
  const filter = ownerFilter(ownerId, role);
  const result = await farmRepo.updateFarm(farmId, filter, dto);
  if (result.count === 0)
    throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farmRepo.findFarmById(farmId, filter);
}

export async function deleteFarm(farmId: string, ownerId: string, role: string) {
  await getFarm(farmId, ownerId, role);
  await farmRepo.softDeleteFarm(farmId, ownerFilter(ownerId, role));
}
