import * as inputRepo from '../repositories/inputRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { CreateInputDto } from '../schemas/createInput.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { InputFilter } from '../repositories/inputRepository.js';

async function assertFarmOwnership(farmId: string, ownerId: string) {
  const farm = await farmRepo.findFarmById(farmId, ownerId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
}

export async function recordInput(farmId: string, ownerId: string, dto: CreateInputDto) {
  await assertFarmOwnership(farmId, ownerId);
  return inputRepo.createInput(farmId, dto);
}

export async function listInputs(
  farmId: string,
  ownerId: string,
  filter: InputFilter,
  pagination: PaginationParams,
) {
  await assertFarmOwnership(farmId, ownerId);
  const [inputs, total] = await Promise.all([
    inputRepo.findInputsByFarm(farmId, filter, pagination),
    inputRepo.countInputsByFarm(farmId, filter),
  ]);
  return { inputs, total };
}
