import * as farmRepo from '../repositories/farmRepository.js';
import * as workerRepo from '../repositories/workerRepository.js';
import * as summaryRepo from '../repositories/summaryRepository.js';
import { createError } from '../middleware/errorHandler.js';
import type { SummaryDateRange } from '../repositories/summaryRepository.js';

export interface FarmSummary {
  farmId: string;
  totalYieldKg: number;
  totalInputCostsKes: number;
  totalLabourCostsKes: number;
  totalCostsKes: number;
  totalRevenueKes: number;
  profitEstimateKes: number;
  dateRange?: { from: string; to: string };
}

export async function getFarmSummary(
  farmId: string,
  requesterId: string,
  role: string,
  fromDate?: string,
  toDate?: string,
): Promise<FarmSummary> {
  if (role === 'farm_worker') {
    const membership = await workerRepo.findWorker(farmId, requesterId);
    if (!membership || !membership.isActive)
      throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  } else {
    const ownedBy = role === 'admin' ? undefined : requesterId;
    const farm = await farmRepo.findFarmById(farmId, ownedBy);
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
  }

  const dateRange: SummaryDateRange | undefined =
    fromDate && toDate ? { gte: new Date(fromDate), lte: new Date(toDate) } : undefined;

  const [inputCosts, labourCosts, harvestTotals] = await Promise.all([
    summaryRepo.aggregateInputCosts(farmId, dateRange),
    summaryRepo.aggregateLabourCosts(farmId, dateRange),
    summaryRepo.aggregateHarvests(farmId, dateRange),
  ]);

  const totalInputCostsKes = Number(inputCosts);
  const totalLabourCostsKes = Number(labourCosts);
  const totalCostsKes = totalInputCostsKes + totalLabourCostsKes;
  const totalRevenueKes = Number(harvestTotals.totalRevenueKes);

  return {
    farmId,
    totalYieldKg: Number(harvestTotals.totalYieldKg),
    totalInputCostsKes,
    totalLabourCostsKes,
    totalCostsKes,
    totalRevenueKes,
    profitEstimateKes: totalRevenueKes - totalCostsKes,
    ...(fromDate && toDate ? { dateRange: { from: fromDate, to: toDate } } : {}),
  };
}
