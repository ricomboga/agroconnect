import { prisma } from '@agroconnect/db/farm';

export interface SummaryDateRange {
  gte: Date;
  lte: Date;
}

export async function aggregateInputCosts(farmId: string, dateRange?: SummaryDateRange) {
  const result = await prisma.input.aggregate({
    where: {
      farmId,
      ...(dateRange ? { appliedDate: dateRange } : {}),
    },
    _sum: { totalCostKes: true },
  });
  return result._sum.totalCostKes ?? 0;
}

export async function aggregateLabourCosts(farmId: string, dateRange?: SummaryDateRange) {
  const result = await prisma.activity.aggregate({
    where: {
      farmId,
      ...(dateRange ? { scheduledDate: dateRange } : {}),
    },
    _sum: { labourCostKes: true },
  });
  return result._sum.labourCostKes ?? 0;
}

export async function aggregateHarvests(farmId: string, dateRange?: SummaryDateRange) {
  const result = await prisma.harvest.aggregate({
    where: {
      farmId,
      ...(dateRange ? { harvestDate: dateRange } : {}),
    },
    _sum: { quantityKg: true, totalRevenueKes: true },
  });
  return {
    totalYieldKg: result._sum.quantityKg ?? 0,
    totalRevenueKes: result._sum.totalRevenueKes ?? 0,
  };
}
