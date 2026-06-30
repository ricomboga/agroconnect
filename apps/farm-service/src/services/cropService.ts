import * as plotRepo from '../repositories/plotRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import * as workerRepo from '../repositories/workerRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { SaveCropDetailsDto } from '../schemas/saveCropDetails.schema.js';
import { AddCropDto } from '../schemas/addCrop.schema.js';
import {
  generateCropSchedule,
  deleteFuturePendingActivities,
  getFarmSchedule,
  ScheduleFilter,
} from './scheduleService.js';

async function assertFarmAccess(farmId: string, ownerId: string, role: string) {
  if (role === 'admin') {
    const farm = await farmRepo.findFarmById(farmId);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return farm;
  }
  if (role === 'farm_worker') {
    const membership = await workerRepo.findWorker(farmId, ownerId);
    if (!membership || !membership.isActive)
      throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    const farm = await farmRepo.findFarmById(farmId);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return farm;
  }
  const farm = await farmRepo.findFarmById(farmId, ownerId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farm;
}

export async function addCrop(
  farmId: string,
  requesterId: string,
  requesterRole: string,
  dto: AddCropDto,
) {
  await assertFarmAccess(farmId, requesterId, requesterRole);

  const plot = await farmRepo.createPlotWithCrop(farmId, {
    cropType: dto.cropType,
    variety: dto.variety,
    plantingDate: dto.plantingDate,
    areaAcres: dto.areaAcres,
    plotNumber: dto.plotNumber,
  });

  const activitiesCreated = await generateCropSchedule(
    farmId,
    plot.id,
    plot.name,
    dto.cropType,
    dto.variety,
    new Date(dto.plantingDate),
  );

  return { plot, activitiesCreated };
}

export async function saveCropDetails(
  farmId: string,
  plotId: string,
  requesterId: string,
  requesterRole: string,
  dto: SaveCropDetailsDto,
) {
  await assertFarmAccess(farmId, requesterId, requesterRole);

  const plot = await plotRepo.findPlotById(plotId, farmId);
  if (!plot) throw createError('Plot not found', 404, 'PLOT_NOT_FOUND', 'error.plot.not_found');

  const plantingDate = new Date(dto.plantingDate);

  if (plot.currentCrop) {
    await deleteFuturePendingActivities(farmId, plotId);
  }

  const updatedPlot = await plotRepo.updatePlotCrop(
    plotId,
    farmId,
    dto.crop,
    dto.variety,
    plantingDate,
  );

  const activitiesCreated = await generateCropSchedule(
    farmId,
    plotId,
    plot.name,
    dto.crop,
    dto.variety,
    plantingDate,
  );

  return { plot: updatedPlot, activitiesCreated };
}

export async function getSchedule(
  farmId: string,
  requesterId: string,
  requesterRole: string,
  filter: ScheduleFilter,
) {
  await assertFarmAccess(farmId, requesterId, requesterRole);
  return getFarmSchedule(farmId, filter);
}
