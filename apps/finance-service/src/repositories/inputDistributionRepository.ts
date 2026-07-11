import { prisma } from '@agroconnect/db/finance';

export interface CreateInputDistributionDto {
  farmerId: string;
  inputType: string;
  valueKes: number;
  distributedAt: string;
}

export async function createInputDistribution(partnerId: string, dto: CreateInputDistributionDto) {
  return prisma.inputDistribution.create({
    data: {
      partnerId,
      farmerId: dto.farmerId,
      inputType: dto.inputType,
      valueKes: dto.valueKes,
      distributedAt: new Date(dto.distributedAt),
    },
  });
}

export async function findDistributionsByPartner(
  partnerId: string,
  range: { fromDate?: string; toDate?: string } = {},
) {
  return prisma.inputDistribution.findMany({
    where: {
      partnerId,
      ...(range.fromDate || range.toDate
        ? {
            distributedAt: {
              ...(range.fromDate ? { gte: new Date(range.fromDate) } : {}),
              ...(range.toDate ? { lte: new Date(range.toDate) } : {}),
            },
          }
        : {}),
    },
    orderBy: { distributedAt: 'desc' },
  });
}
