import { PrismaClient, Prisma } from '../generated/community-client/index.js';

export { Prisma };

const globalForPrisma = global as unknown as { communityPrisma: PrismaClient };

export const prisma =
  globalForPrisma.communityPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.communityPrisma = prisma;
