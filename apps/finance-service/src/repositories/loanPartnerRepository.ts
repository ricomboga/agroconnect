import { prisma } from '@agroconnect/db/finance';

export async function findAllPartners() {
  return prisma.loanPartner.findMany({
    where:   { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function findPartnerById(id: string) {
  return prisma.loanPartner.findUnique({ where: { id } });
}
