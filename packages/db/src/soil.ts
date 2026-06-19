import { PrismaClient } from '../generated/soil-client/index.js';

const globalForPrisma = global as unknown as { soilPrisma: PrismaClient };
export const prisma =
  globalForPrisma.soilPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.soilPrisma = prisma;
