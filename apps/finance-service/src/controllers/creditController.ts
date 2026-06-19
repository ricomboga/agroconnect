import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as creditScoringService from '../services/creditScoringService.js';

function extractToken(req: AuthenticatedRequest): string {
  const header = req.headers['authorization'] ?? '';
  return header.replace(/^Bearer\s+/i, '');
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
    res.json({ data: result });
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
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
