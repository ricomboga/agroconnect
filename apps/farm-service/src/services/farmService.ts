import * as farmRepo from '../repositories/farmRepository.js';
import * as workerRepo from '../repositories/workerRepository.js';
import { publishFarmCreated } from '../events/producers/farmCreatedProducer.js';
import { CreateFarmDto } from '../schemas/createFarm.schema.js';
import { UpdateFarmDto } from '../schemas/updateFarm.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { generateCropSchedule } from './scheduleService.js';
import { logger } from '../logger.js';

function ownerFilter(ownerId: string, role: string): string | undefined {
  return role === 'admin' ? undefined : ownerId;
}

export async function createFarm(ownerId: string, dto: CreateFarmDto) {
  const { ownerId: _ignoredOwnerId, firstCrop, firstCropVariety, plantingDate, ...farmFields } = dto;

  const farm = await farmRepo.createFarm(ownerId, farmFields);

  try {
    await publishFarmCreated(farm.id, ownerId, farm.county);
  } catch (err) {
    logger.error({ err, farmId: farm.id, context: 'createFarm.publishFarmCreated' }, 'Kafka publish failed — farm still created');
  }

  // If the farmer provided their first crop at sign-up, create a plot and generate its schedule.
  if (firstCrop && plantingDate) {
    try {
      const plot = await farmRepo.createPlotWithCrop(farm.id, {
        cropType: firstCrop,
        variety: firstCropVariety,
        plantingDate,
        areaAcres: Number(farm.areaAcres),
        plotNumber: 'Plot 1',
      });
      await generateCropSchedule(
        farm.id,
        plot.id,
        plot.name,
        firstCrop,
        firstCropVariety,
        new Date(plantingDate),
      );
    } catch (err) {
      logger.error({ err, farmId: farm.id, context: 'createFarm.generateFirstCropSchedule' }, 'First-crop schedule generation failed');
    }
  }

  return farmRepo.findFarmById(farm.id);
}

export interface ListFarmsFilters {
  search?: string;
  county?: string;
}

export async function listFarms(
  ownerId: string,
  role: string,
  pagination: PaginationParams,
  filters: ListFarmsFilters = {},
) {
  let farms: Awaited<ReturnType<typeof farmRepo.findFarmsByOwner>>;
  let total: number;

  if (role === 'farm_worker') {
    [farms, total] = await Promise.all([
      farmRepo.findFarmsByWorker(ownerId, pagination),
      farmRepo.countFarmsByWorker(ownerId),
    ]);
  } else {
    const filter = ownerFilter(ownerId, role);
    [farms, total] = await Promise.all([
      farmRepo.findFarmsByOwner(filter, pagination, filters),
      farmRepo.countFarmsByOwner(filter, filters),
    ]);
  }

  const statsMap = await farmRepo.getFarmStats(farms.map((f) => f.id));
  const farmsWithStats = farms.map((f) => ({ ...f, ...statsMap[f.id] }));
  return { farms: farmsWithStats, total };
}

export async function getFarm(farmId: string, ownerId: string, role: string) {
  if (role === 'farm_worker') {
    const membership = await workerRepo.findWorker(farmId, ownerId);
    if (!membership || !membership.isActive)
      throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    const farm = await farmRepo.findFarmById(farmId);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return farm;
  }
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
