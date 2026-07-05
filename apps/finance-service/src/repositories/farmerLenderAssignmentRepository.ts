import { prisma } from '@agroconnect/db/finance';

export async function upsertFarmerLenderAssignment(farmerId: string, lenderId: string) {
  return prisma.farmerLenderAssignment.upsert({
    where: { farmerId },
    create: { farmerId, lenderId },
    update: { lenderId, assignedAt: new Date() },
  });
}
