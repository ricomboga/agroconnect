import * as farmRepo from '../repositories/farmRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';

const MEDIA_SERVICE_URL = process.env['MEDIA_SERVICE_URL'] ?? 'http://localhost:3010';

export async function generateReport(
  farmId: string,
  ownerId: string,
  role: string,
): Promise<{ url: string } | { jobId: string }> {
  const ownedBy = role === 'admin' ? undefined : ownerId;
  const farm = await farmRepo.findFarmById(farmId, ownedBy);
  if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${MEDIA_SERVICE_URL}/internal/reports/farm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId, requestedBy: ownerId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.error(
        { farmId, status: response.status, context: 'reportService' },
        'media-service returned error',
      );
      throw createError(
        'Report generation failed',
        502,
        'REPORT_GENERATION_FAILED',
        'error.report.generation_failed',
      );
    }

    return (await response.json()) as { url: string } | { jobId: string };
  } finally {
    clearTimeout(timeout);
  }
}
