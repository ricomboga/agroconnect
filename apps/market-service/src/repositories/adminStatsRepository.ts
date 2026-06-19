import { prisma } from '@agroconnect/db/market';

export async function countActiveListings() {
  return prisma.produceListing.count({ where: { status: 'active' } });
}
