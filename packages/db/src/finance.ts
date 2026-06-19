import { PrismaClient, Prisma } from '../generated/finance-client/index.js';

export { Prisma };

const globalForPrisma = global as unknown as { financeprisma: PrismaClient };

export const prisma =
  globalForPrisma.financeprisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.financeprisma = prisma;
