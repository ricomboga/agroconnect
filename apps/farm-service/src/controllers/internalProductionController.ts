import type { Request, Response, NextFunction } from 'express';
import { getProductionSummary } from '../services/productionSummaryService.js';
import { createError } from '../middleware/errorHandler.js';
import { findFarmsByOwners, findFarmsByCounties } from '../repositories/farmRepository.js';

function parseDate(raw: string | undefined, field: string): Date | undefined {
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createError(`${field} must be YYYY-MM-DD`, 400, 'VALIDATION_ERROR', 'error.validation');
  }
  return new Date(raw);
}

/**
 * @openapi
 * /internal/production/{farmerId}:
 *   get:
 *     summary: Aggregated crop/animal-product/collection totals for a farmer (service-to-service)
 *     tags: [Internal]
 *     security:
 *       - serviceToken: []
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Production summary for the farmer
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Missing or invalid service token
 */
export async function getFarmerProductionSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farmerId = req.params['farmerId'] as string;
    const from = parseDate(req.query['from_date'] as string | undefined, 'from_date');
    const to = parseDate(req.query['to_date'] as string | undefined, 'to_date');

    const summary = await getProductionSummary(farmerId, { from, to });
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /internal/production/by-counties:
 *   get:
 *     summary: Farm profile for every farmer with a farm in the given counties (service-to-service) — powers NGO region-based rosters
 *     tags: [Internal]
 *     security:
 *       - serviceToken: []
 *     parameters:
 *       - in: query
 *         name: counties
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated county names
 *     responses:
 *       200:
 *         description: List of farmer profiles (deduped by owner) with earliest farm registration date
 */
export async function getFarmProfilesByCountiesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const counties = String(req.query['counties'] ?? '').split(',').filter(Boolean);
    if (counties.length === 0) {
      res.json({ data: [] });
      return;
    }

    const farms = await findFarmsByCounties(counties);
    const byOwner = new Map<
      string,
      { farmerId: string; county: string | null; subCounty: string | null; areaAcres: number; farmType: string; firstRegisteredAt: string }
    >();
    for (const farm of farms) {
      const existing = byOwner.get(farm.ownerId);
      if (!existing) {
        byOwner.set(farm.ownerId, {
          farmerId: farm.ownerId,
          county: farm.county,
          subCounty: farm.subCounty,
          areaAcres: Number(farm.areaAcres),
          farmType: farm.farmType,
          firstRegisteredAt: farm.createdAt.toISOString(),
        });
      } else {
        existing.areaAcres += Number(farm.areaAcres);
      }
    }
    res.json({ data: [...byOwner.values()] });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /internal/production/by-owners:
 *   get:
 *     summary: Farm profile (county, sub-county, total acreage, farm type) for a batch of owner ids (service-to-service)
 *     tags: [Internal]
 *     security:
 *       - serviceToken: []
 *     parameters:
 *       - in: query
 *         name: owner_ids
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated farmer/owner ids
 *     responses:
 *       200:
 *         description: Map of ownerId to aggregated farm profile
 */
export async function getFarmProfilesByOwnersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ownerIds = String(req.query['owner_ids'] ?? '').split(',').filter(Boolean);
    if (ownerIds.length === 0) {
      res.json({ data: {} });
      return;
    }

    const farms = await findFarmsByOwners(ownerIds);
    const map: Record<string, { county: string | null; subCounty: string | null; areaAcres: number; farmType: string }> = {};
    for (const farm of farms) {
      const existing = map[farm.ownerId];
      if (!existing) {
        map[farm.ownerId] = {
          county: farm.county,
          subCounty: farm.subCounty,
          areaAcres: Number(farm.areaAcres),
          farmType: farm.farmType,
        };
      } else {
        existing.areaAcres += Number(farm.areaAcres);
      }
    }
    res.json({ data: map });
  } catch (err) {
    next(err);
  }
}
