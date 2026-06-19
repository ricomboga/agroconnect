import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as soilTestService from '../services/soilTestService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function createSoilTest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farmId = req.params['farmId'] as string;
    const test = await soilTestService.createSoilTest(farmId, req.user.id, req.body);
    res.status(201).json({ data: test });
  } catch (err) {
    next(err);
  }
}

export async function listSoilTests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farmId = req.params['farmId'] as string;
    const pagination = parsePaginationParams(req.query);
    const { tests, total, trend } = await soilTestService.listSoilTests(
      farmId,
      req.user.id,
      req.user.role,
      pagination,
    );
    res.json({
      data: tests,
      meta: {
        total,
        page: Number(req.query['page'] ?? 1),
        page_size: pagination.take,
        trend,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecommendation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farmId = req.params['farmId'] as string;
    const { recommendations, latestTest } = await soilTestService.getRecommendation(
      farmId,
      req.user.id,
      req.user.role,
    );
    res.json({
      data: recommendations,
      meta: {
        based_on_test_id: latestTest.id,
        tested_at: latestTest.testedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
