import * as farmClient from '../clients/farmServiceClient.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import { computeScoreFromData, type ScoreResult } from '../scoring/computeScore.js';
import { logger } from '../logger.js';

export interface CreditScoreView extends ScoreResult {
  computedAt: Date;
}

export async function computeScore(
  farmerId: string,
  accessToken: string,
): Promise<CreditScoreView> {
  logger.info({ farmerId }, 'Computing credit score');

  const [harvests, inputs, activities] = await Promise.all([
    farmClient.getFarmerHarvests(farmerId, accessToken),
    farmClient.getFarmerInputs(farmerId, accessToken),
    farmClient.getFarmerActivities(farmerId, accessToken),
  ]);

  const result = computeScoreFromData(harvests, inputs, activities);

  const saved = await creditScoreRepo.upsertCreditScore(farmerId, result);

  logger.info(
    { farmerId, score: result.score, band: result.band },
    'Credit score computed and saved',
  );

  return { ...result, computedAt: saved.computedAt };
}

export async function getOrComputeScore(
  farmerId: string,
  accessToken: string,
): Promise<CreditScoreView> {
  const existing = await creditScoreRepo.findCreditScore(farmerId);

  if (existing) {
    return {
      score: Number(existing.score),
      band: existing.band as ScoreResult['band'],
      maxLoanKes: Number(existing.maxLoanKes),
      seasonsOfData: existing.seasonsOfData,
      avgYieldScore: Number(existing.avgYieldScore),
      inputManagementScore: Number(existing.inputManagementScore),
      activityComplianceScore: Number(existing.activityComplianceScore),
      platformEngagementScore: Number(existing.platformEngagementScore),
      computedAt: existing.computedAt,
    };
  }

  return computeScore(farmerId, accessToken);
}
