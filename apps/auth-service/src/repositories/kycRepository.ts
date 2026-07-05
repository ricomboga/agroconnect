import { prisma } from '@agroconnect/db/auth';

export async function findDocumentsByUser(userId: string) {
  return prisma.kycDocument.findMany({ where: { userId }, orderBy: { uploadedAt: 'asc' } });
}

export async function findHistoryByUser(userId: string) {
  return prisma.kycHistoryEntry.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export async function createHistoryEntry(params: {
  userId: string;
  action: string;
  actor: string;
  note?: string;
}) {
  return prisma.kycHistoryEntry.create({ data: params });
}

export async function findPendingKycUsers(filter: { role?: string; county?: string }) {
  return prisma.user.findMany({
    where: {
      kycStatus: { in: ['pending', 'submitted'] },
      ...(filter.role !== undefined ? { role: filter.role as never } : {}),
      ...(filter.county !== undefined ? { county: filter.county } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
}
