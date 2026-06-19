import { prisma } from '@agroconnect/db/finance';
import type { ScoreResult } from '../scoring/computeScore.js';

export async function upsertCreditScore(farmerId: string, result: ScoreResult) {
  return prisma.creditScore.upsert({
    where: { farmerId },
    update: {
      score: result.score,
      band: result.band,
      maxLoanKes: result.maxLoanKes,
      seasonsOfData: result.seasonsOfData,
      avgYieldScore: result.avgYieldScore,
      inputManagementScore: result.inputManagementScore,
      activityComplianceScore: result.activityComplianceScore,
      platformEngagementScore: result.platformEngagementScore,
      computedAt: new Date(),
    },
    create: {
      farmerId,
      score: result.score,
      band: result.band,
      maxLoanKes: result.maxLoanKes,
      seasonsOfData: result.seasonsOfData,
      avgYieldScore: result.avgYieldScore,
      inputManagementScore: result.inputManagementScore,
      activityComplianceScore: result.activityComplianceScore,
      platformEngagementScore: result.platformEngagementScore,
      computedAt: new Date(),
    },
  });
}

export async function findCreditScore(farmerId: string) {
  return prisma.creditScore.findUnique({ where: { farmerId } });
}
