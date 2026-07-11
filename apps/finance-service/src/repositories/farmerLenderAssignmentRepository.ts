import { prisma } from '@agroconnect/db/finance';

export async function upsertFarmerLenderAssignment(farmerId: string, lenderId: string) {
  return prisma.farmerLenderAssignment.upsert({
    where: { farmerId },
    create: { farmerId, lenderId },
    update: { lenderId, assignedAt: new Date() },
  });
}

export async function countFarmersByLender(lenderId: string) {
  return prisma.farmerLenderAssignment.count({ where: { lenderId } });
}

export async function findAssignmentsByLender(lenderId: string) {
  return prisma.farmerLenderAssignment.findMany({
    where: { lenderId },
    select: { assignedAt: true },
    orderBy: { assignedAt: 'asc' },
  });
}

export async function findFarmerIdsByLender(lenderId: string): Promise<string[]> {
  const rows = await prisma.farmerLenderAssignment.findMany({
    where: { lenderId },
    select: { farmerId: true },
  });
  return rows.map((r) => r.farmerId);
}
