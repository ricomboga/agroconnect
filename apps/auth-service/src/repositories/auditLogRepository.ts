import { prisma } from '@agroconnect/db/auth';

export interface CreateAuditLogParams {
  actor: string;
  action: string;
  category: string;
  refId?: string;
  note?: string;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  return prisma.auditLog.create({ data: params });
}

export async function listAuditLogs(pagination: { take: number; skip: number }) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countAuditLogs() {
  return prisma.auditLog.count();
}
