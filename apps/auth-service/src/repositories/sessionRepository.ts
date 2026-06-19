import { prisma } from '@agroconnect/db/auth';

export interface CreateSessionParams {
  userId: string;
  deviceId?: string | null;
  refreshTokenHash: string;
  ipAddress: string;
  userAgent?: string;
  expiresAt: Date;
}

export async function createSession(params: CreateSessionParams) {
  return prisma.session.create({ data: params });
}

export async function findSessionByHash(refreshTokenHash: string) {
  return prisma.session.findFirst({
    where: { refreshTokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
}

export async function deleteSession(id: string) {
  return prisma.session.delete({ where: { id } });
}

export async function deleteSessionsByUserId(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

export async function deleteSessionsByUserIdAndDevice(userId: string, deviceId: string) {
  return prisma.session.deleteMany({ where: { userId, deviceId } });
}
