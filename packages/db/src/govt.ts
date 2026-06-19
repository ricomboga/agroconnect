import { PrismaClient, Prisma } from '../generated/govt-client/index.js';

export { Prisma };

const globalForPrisma = global as unknown as { govtPrisma: PrismaClient };

export const prisma =
  globalForPrisma.govtPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.govtPrisma = prisma;
