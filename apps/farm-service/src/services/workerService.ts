import * as workerRepo from '../repositories/workerRepository.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { AddWorkerDto } from '../schemas/addWorker.schema.js';
import { UpdateWorkerRoleDto } from '../schemas/updateWorkerRole.schema.js';
import { publishWorkerAssigned } from '../events/producers/workerAssignedProducer.js';
import { logger } from '../logger.js';

async function assertFarmOwner(farmId: string, userId: string, role: string) {
  const ownerFilter = role === 'admin' ? undefined : userId;
  const farm = await farmRepo.findFarmById(farmId, ownerFilter);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farm;
}

async function assertFarmAccess(farmId: string, userId: string, role: string) {
  if (role === 'admin') {
    const farm = await farmRepo.findFarmById(farmId);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return farm;
  }
  if (role === 'farm_worker') {
    const membership = await workerRepo.findWorker(farmId, userId);
    if (!membership || !membership.isActive)
      throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    const farm = await farmRepo.findFarmById(farmId);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    return farm;
  }
  const farm = await farmRepo.findFarmById(farmId, userId);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  return farm;
}

export async function addWorker(
  farmId: string,
  requesterId: string,
  requesterRole: string,
  dto: AddWorkerDto,
) {
  const farm = await assertFarmOwner(farmId, requesterId, requesterRole);
  const existing = await workerRepo.findWorker(farmId, dto.userId);
  if (existing && existing.isActive) {
    throw createError(
      'Worker already on this farm',
      409,
      'WORKER_ALREADY_EXISTS',
      'error.worker.already_exists',
    );
  }
  let worker;
  if (existing && !existing.isActive) {
    await workerRepo.updateWorkerRole(farmId, dto.userId, { role: dto.role });
    worker = await workerRepo.findWorker(farmId, dto.userId);
  } else {
    worker = await workerRepo.addWorker(farmId, dto);
  }

  try {
    await publishWorkerAssigned(
      farmId,
      farm.name,
      dto.userId,
      dto.role,
      requesterId,
      worker?.addedAt ?? new Date(),
    );
  } catch (err) {
    logger.error({ err, farmId, workerId: dto.userId, context: 'addWorker.publishWorkerAssigned' }, 'Kafka publish failed — worker still added');
  }

  return worker;
}

async function fetchWorkerProfiles(userIds: string[]): Promise<Record<string, { fullName: string; phone: string }>> {
  if (userIds.length === 0) return {};
  const authUrl = process.env['AUTH_SERVICE_URL'];
  const serviceSecret = process.env['INTERNAL_SERVICE_SECRET'];
  if (!authUrl || !serviceSecret) return {};
  try {
    const res = await fetch(
      `${authUrl}/internal/admin/users/batch?ids=${userIds.join(',')}`,
      { headers: { 'x-service-token': serviceSecret } },
    );
    if (!res.ok) return {};
    const body = await res.json() as { data: Record<string, { fullName: string; phone: string }> };
    return body.data ?? {};
  } catch (err) {
    logger.error({ err, context: 'fetchWorkerProfiles' }, 'Failed to fetch worker profiles from auth-service');
    return {};
  }
}

export async function listWorkers(farmId: string, requesterId: string, requesterRole: string) {
  await assertFarmAccess(farmId, requesterId, requesterRole);
  const workers = await workerRepo.findWorkersByFarm(farmId);
  const profiles = await fetchWorkerProfiles(workers.map((w) => w.userId));
  return workers.map((w) => ({
    id: w.id,
    userId: w.userId,
    role: w.role,
    isActive: w.isActive,
    addedAt: w.addedAt,
    assignedTaskCount: w.assignedTaskCount,
    fullName: profiles[w.userId]?.fullName ?? `Worker ${w.userId.slice(0, 8)}`,
    phone: profiles[w.userId]?.phone ?? null,
  }));
}

export async function removeWorker(
  farmId: string,
  workerId: string,
  requesterId: string,
  requesterRole: string,
) {
  await assertFarmOwner(farmId, requesterId, requesterRole);
  const worker = await workerRepo.findWorker(farmId, workerId);
  if (!worker) {
    throw createError('Worker not found', 404, 'WORKER_NOT_FOUND', 'error.worker.not_found');
  }
  await workerRepo.deactivateWorker(farmId, workerId);
}

export async function updateWorkerRole(
  farmId: string,
  workerId: string,
  requesterId: string,
  requesterRole: string,
  dto: UpdateWorkerRoleDto,
) {
  await assertFarmOwner(farmId, requesterId, requesterRole);
  const worker = await workerRepo.findWorker(farmId, workerId);
  if (!worker || !worker.isActive) {
    throw createError('Worker not found', 404, 'WORKER_NOT_FOUND', 'error.worker.not_found');
  }
  await workerRepo.updateWorkerRole(farmId, workerId, dto);
  return workerRepo.findWorker(farmId, workerId);
}
