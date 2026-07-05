import { prisma } from '@agroconnect/db/finance';

export async function findAllProducts() {
  return prisma.loanProduct.findMany({
    where:   { active: true },
    include: { partner: true },
    orderBy: [{ partnerId: 'asc' }, { name: 'asc' }],
  });
}

export async function findProductById(id: string) {
  return prisma.loanProduct.findUnique({
    where:   { id },
    include: { partner: true },
  });
}
