import { PrismaClient, Prisma } from '../generated/market-client/index.js';

export { Prisma };

const globalForPrisma = global as unknown as { marketPrisma: PrismaClient };

export const prisma =
  globalForPrisma.marketPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.marketPrisma = prisma;
