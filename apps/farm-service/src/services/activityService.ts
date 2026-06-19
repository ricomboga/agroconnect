import * as activityRepo from '../repositories/activityRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { publishActivityCompleted } from '../events/producers/activityCompletedProducer.js';
import { CreateActivityDto } from '../schemas/createActivity.schema.js';
import { UpdateActivityDto } from '../schemas/updateActivity.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { ActivityFilter } from '../repositories/activityRepository.js';

async function assertFarmAccess(farmId: string, ownerId: string, role: string) {
  const ownedBy = role === 'admin' ? undefined : ownerId;
  const farm = await farmRepo.findFarmById(farmId, ownedBy);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
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
    await publishActivityCompleted(activityId, farmId, ownerId, activity.type);
  }

  return activityRepo.findActivityById(activityId, farmId);
}
