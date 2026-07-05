import { prisma } from '@agroconnect/db/farm';
import { AddWorkerDto } from '../schemas/addWorker.schema.js';
import { UpdateWorkerRoleDto } from '../schemas/updateWorkerRole.schema.js';

export async function addWorker(farmId: string, dto: AddWorkerDto) {
  return prisma.farmWorker.create({
    data: { farmId, userId: dto.userId, role: dto.role },
  });
}

export async function findWorkersByFarm(farmId: string) {
  const workers = await prisma.farmWorker.findMany({
    where: { farmId, isActive: true },
    orderBy: { addedAt: 'asc' },
  });

  // Count pending tasks assigned to each worker on this farm
  const taskCounts = await prisma.activity.groupBy({
    by: ['assignedToWorkerId'],
    where: {
      farmId,
      assignedToWorkerId: { in: workers.map((w) => w.userId), not: null },
      status: 'pending',
    },
    _count: { id: true },
  });
  const countMap = new Map(taskCounts.map((r) => [r.assignedToWorkerId, r._count.id]));

  return workers.map((w) => ({ ...w, assignedTaskCount: countMap.get(w.userId) ?? 0 }));
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
