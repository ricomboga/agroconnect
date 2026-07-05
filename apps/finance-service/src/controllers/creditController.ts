import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as creditScoringService from '../services/creditScoringService.js';
import type { CreditScoreView } from '../services/creditScoringService.js';

function extractToken(req: AuthenticatedRequest): string {
  const header = req.headers['authorization'] ?? '';
  return header.replace(/^Bearer\s+/i, '');
}

// Each of the 4 sub-scores maxes out at 25 raw points; scale to /100 for the UI.
const COMPONENT_MAX = 25;
const COMPONENT_WEIGHT = 25;

function toApiResponse(result: CreditScoreView) {
  return {
    score: result.score,
    band: result.band,
    maxLoanKes: result.maxLoanKes,
    lastComputedAt: result.computedAt.toISOString(),
    components: {
      yield: {
        score: Math.round((result.avgYieldScore / COMPONENT_MAX) * 100),
        weight: COMPONENT_WEIGHT,
      },
      inputs: {
        score: Math.round((result.inputManagementScore / COMPONENT_MAX) * 100),
        weight: COMPONENT_WEIGHT,
      },
      activities: {
        score: Math.round((result.activityComplianceScore / COMPONENT_MAX) * 100),
        weight: COMPONENT_WEIGHT,
      },
      platform: {
        score: Math.round((result.platformEngagementScore / COMPONENT_MAX) * 100),
        weight: COMPONENT_WEIGHT,
      },
    },
  };
}

export async function getCreditScore(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await creditScoringService.getOrComputeScore(
      req.user.id,
      extractToken(req),
    );
    res.json({ data: toApiResponse(result) });
  } catch (err) {
    next(err);
  }
}

export async function recomputeCreditScore(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await creditScoringService.computeScore(req.user.id, extractToken(req));
    res.json({ data: toApiResponse(result) });
  } catch (err) {
    next(err);
  }
}
