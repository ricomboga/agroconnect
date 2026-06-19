import { prisma } from '@agroconnect/db/market';

export async function findAllPrices() {
  return prisma.commodityPrice.findMany({ orderBy: { crop: 'asc' } });
}
