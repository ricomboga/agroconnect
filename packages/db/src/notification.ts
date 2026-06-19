import { PrismaClient, Prisma } from '../generated/notification-client/index.js';

export { Prisma };

const globalForPrisma = global as unknown as { notificationPrisma: PrismaClient };

export const prisma =
  globalForPrisma.notificationPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.notificationPrisma = prisma;
