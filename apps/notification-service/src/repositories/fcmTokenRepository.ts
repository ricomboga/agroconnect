import { prisma } from '@agroconnect/db/notification';

export async function findTokenByUserId(userId: string): Promise<string | null> {
  const record = await prisma.fcmToken.findUnique({ where: { userId } });
  return record?.token ?? null;
}

export async function upsertToken(userId: string, token: string): Promise<void> {
  await prisma.fcmToken.upsert({
    where: { userId },
    create: { userId, token },
    update: { token },
  });
}

export async function findAllTokens(): Promise<{ userId: string; token: string }[]> {
  return prisma.fcmToken.findMany({ select: { userId: true, token: true } });
}
