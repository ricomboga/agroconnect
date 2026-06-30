import { prisma } from '@agroconnect/db/farm';
import { AddWorkerDto } from '../schemas/addWorker.schema.js';
import { UpdateWorkerRoleDto } from '../schemas/updateWorkerRole.schema.js';

export async function addWorker(farmId: string, dto: AddWorkerDto) {
  return prisma.farmWorker.create({
    data: { farmId, userId: dto.userId, role: dto.role },
  });
}

export async function findWorkersByFarm(farmId: string) {
  return prisma.farmWorker.findMany({
    where: { farmId, isActive: true },
    orderBy: { addedAt: 'asc' },
  });
}

export async function findWorker(farmId: string, userId: string) {
  return prisma.farmWorker.findUnique({
    where: { farmId_userId: { farmId, userId } },
  });
}

export async function deactivateWorker(farmId: string, userId: string) {
  return prisma.farmWorker.updateMany({
    where: { farmId, userId },
    data: { isActive: false },
  });
}

export async function updateWorkerRole(
  farmId: string,
  userId: string,
  dto: UpdateWorkerRoleDto,
) {
  return prisma.farmWorker.updateMany({
    where: { farmId, userId },
    data: { role: dto.role, isActive: true },
  });
}
