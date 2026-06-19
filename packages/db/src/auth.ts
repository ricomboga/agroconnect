import { PrismaClient } from '../generated/auth-client/index.js';

const globalForPrisma = global as unknown as { authPrisma: PrismaClient };

export const prisma =
  globalForPrisma.authPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.authPrisma = prisma;
