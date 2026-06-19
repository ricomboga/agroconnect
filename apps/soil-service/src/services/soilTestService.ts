import * as soilTestRepo from '../repositories/soilTestRepository.js';
import { buildRecommendations } from './recommendationService.js';
import { CreateSoilTestDto } from '../schemas/createSoilTest.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

function ownerFilter(farmerId: string, role: string): string | undefined {
  return role === 'admin' ? undefined : farmerId;
}

const OPTIMAL_PH_CENTER = 6.75;

function computePhTrend(
  tests: Array<{ ph: { toString(): string } | string | number }>,
): 'improving' | 'declining' | 'stable' | null {
  if (tests.length < 2) return null;
  const latest = Number(tests[0]!.ph);
  const prev = Number(tests[1]!.ph);
  const delta = Math.abs(prev - OPTIMAL_PH_CENTER) - Math.abs(latest - OPTIMAL_PH_CENTER);
  if (Math.abs(delta) < 0.1) return 'stable';
  return delta > 0 ? 'improving' : 'declining';
}

export async function createSoilTest(farmId: string, farmerId: string, dto: CreateSoilTestDto) {
  return soilTestRepo.createSoilTest(farmId, farmerId, dto);
}

export async function listSoilTests(
  farmId: string,
  farmerId: string,
  role: string,
  pagination: PaginationParams,
) {
  const filter = ownerFilter(farmerId, role);
  const [tests, total, recentTwo] = await Promise.all([
    soilTestRepo.findSoilTests(farmId, filter, pagination),
    soilTestRepo.countSoilTests(farmId, filter),
    soilTestRepo.findRecentSoilTests(farmId, filter, 2),
  ]);

  const trend = { ph: computePhTrend(recentTwo) };
  return { tests, total, trend };
}

export async function getRecommendation(farmId: string, farmerId: string, role: string) {
  const filter = ownerFilter(farmerId, role);
  const latest = await soilTestRepo.findLatestSoilTest(farmId, filter);
  if (!latest) {
    throw createError(
      'No soil tests found for this farm',
      404,
      'SOIL_TEST_NOT_FOUND',
      'error.soil_test.not_found',
    );
  }

  const recommendations = await buildRecommendations(latest);
  return { recommendations, latestTest: latest };
}
