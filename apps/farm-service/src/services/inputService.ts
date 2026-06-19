import * as inputRepo from '../repositories/inputRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { CreateInputDto } from '../schemas/createInput.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { InputFilter } from '../repositories/inputRepository.js';

async function assertFarmAccess(farmId: string, ownerId: string, role: string) {
  const ownedBy = role === 'admin' ? undefined : ownerId;
  const farm = await farmRepo.findFarmById(farmId, ownedBy);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
}

function buildInputFilter(type?: string, season?: number): InputFilter {
  const filter: InputFilter = {};
  if (type !== undefined) {
    filter.type = type as InputFilter['type'];
  }
  if (season !== undefined) {
    filter.appliedDateRange = {
      gte: new Date(`${season}-01-01`),
      lte: new Date(`${season}-12-31`),
    };
  }
  return filter;
}

export async function recordInput(
  farmId: string,
  ownerId: string,
  role: string,
  dto: CreateInputDto,
) {
  await assertFarmAccess(farmId, ownerId, role);
  return inputRepo.createInput(farmId, dto);
}

export async function listInputs(
  farmId: string,
  ownerId: string,
  role: string,
  rawFilter: { type?: string; season?: number },
  pagination: PaginationParams,
) {
  await assertFarmAccess(farmId, ownerId, role);
  const filter = buildInputFilter(rawFilter.type, rawFilter.season);
  const [inputs, total] = await Promise.all([
    inputRepo.findInputsByFarm(farmId, filter, pagination),
    inputRepo.countInputsByFarm(farmId, filter),
  ]);
  return { inputs, total };
}
