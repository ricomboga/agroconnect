import { prisma } from '@agroconnect/db/auth';

export async function findExpertsByCounty(county?: string) {
  const allProviders = await prisma.serviceProvider.findMany({
    where: {
      isActive: true,
      type: { in: ['extension_officer', 'vet_officer', 'agronomist'] },
    },
  });

  const providers = county
    ? allProviders.filter((p) => (p.countiesServed as string[]).includes(county))
    : allProviders;

  const userIds = providers.map((p) => p.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, county: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const assignmentCounts = await prisma.farmerExpertAssignment.groupBy({
    by: ['expertId'],
    where: { expertId: { in: userIds } },
    _count: { expertId: true },
  });
  const countMap = new Map(assignmentCounts.map((a) => [a.expertId, a._count.expertId]));

  return providers.map((p) => ({
    ...p,
    user: userMap.get(p.userId) ?? null,
    currentFarmers: countMap.get(p.userId) ?? 0,
  }));
}

export async function upsertFarmerExpertAssignment(farmerId: string, expertId: string) {
  return prisma.farmerExpertAssignment.upsert({
    where: { farmerId },
    create: { farmerId, expertId },
    update: { expertId, assignedAt: new Date() },
  });
}
