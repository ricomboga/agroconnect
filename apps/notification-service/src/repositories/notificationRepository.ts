import { prisma } from '@agroconnect/db/notification';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
}

export async function createNotification(data: CreateNotificationInput) {
  return prisma.notification.create({ data });
}

export async function findNotificationsByUser(
  userId: string,
  opts: { take: number; skip: number; unreadOnly: boolean },
) {
  const where = { userId, ...(opts.unreadOnly ? { read: false } : {}) };
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      skip: opts.skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { notifications, total, unreadCount };
}

export async function markNotificationRead(id: string, userId: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  return result.count > 0;
}
