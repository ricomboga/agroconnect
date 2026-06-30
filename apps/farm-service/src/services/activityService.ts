import * as activityRepo from '../repositories/activityRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import * as workerRepo from '../repositories/workerRepository.js';
import { publishActivityCompleted } from '../events/producers/activityCompletedProducer.js';
import { CreateActivityDto } from '../schemas/createActivity.schema.js';
import { UpdateActivityDto } from '../schemas/updateActivity.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { ActivityFilter } from '../repositories/activityRepository.js';
import { logger } from '../logger.js';

async function assertFarmAccess(farmId: string, userId: string, role: string) {
  if (role === 'admin') {
    const farm = await farmRepo.findFarmById(farmId);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return;
  }
  // Farm workers check membership; everyone else checks ownership
  if (role === 'farm_worker') {
    const membership = await workerRepo.findWorker(farmId, userId);
    if (!membership || !membership.isActive)
      throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return;
  }
  const farm = await farmRepo.findFarmById(farmId, userId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
}

export async function getActivity(
  farmId: string,
  ownerId: string,
  role: string,
  activityId: string,
) {
  await assertFarmAccess(farmId, ownerId, role);
  const activity = await activityRepo.findActivityByIdWithPlot(activityId, farmId);
  if (!activity)
    throw createError('Activity not found', 404, 'ACTIVITY_NOT_FOUND', 'error.activity.not_found');
  return activity;
}

export async function scheduleActivity(
  farmId: string,
  ownerId: string,
  role: string,
  dto: CreateActivityDto,
) {
  await assertFarmAccess(farmId, ownerId, role);
  return activityRepo.createActivity(farmId, dto);
}

export async function listActivities(
  farmId: string,
  ownerId: string,
  role: string,
  filter: ActivityFilter,
  pagination: PaginationParams,
) {
  await assertFarmAccess(farmId, ownerId, role);
  const [activities, total] = await Promise.all([
    activityRepo.findActivitiesByFarm(farmId, filter, pagination),
    activityRepo.countActivitiesByFarm(farmId, filter),
  ]);
  return { activities, total };
}

export async function updateActivity(
  farmId: string,
  ownerId: string,
  role: string,
  activityId: string,
  dto: UpdateActivityDto,
) {
  await assertFarmAccess(farmId, ownerId, role);
  const activity = await activityRepo.findActivityById(activityId, farmId);
  if (!activity)
    throw createError('Activity not found', 404, 'ACTIVITY_NOT_FOUND', 'error.activity.not_found');

  await activityRepo.updateActivity(activityId, farmId, dto);

  if (dto.status === 'completed') {
    try {
      await publishActivityCompleted(
        activityId,
        farmId,
        ownerId,
        activity.type,
        activity.assignedToWorkerId ?? null,
      );
    } catch (err) {
      logger.error({ err, activityId, farmId, context: 'updateActivity.publishActivityCompleted' }, 'Kafka publish failed — activity still updated');
    }
  }

  return activityRepo.findActivityByIdWithPlot(activityId, farmId);
}
