import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as inputDistributionRepo from '../repositories/inputDistributionRepository.js';
import type { CreateInputDistributionDto } from '../schemas/createInputDistribution.schema.js';
import { createError } from '../middleware/errorHandler.js';

function requirePartnerBankId(req: AuthenticatedRequest): string {
  const id = req.user.partner_bank_id;
  if (!id) {
    throw createError(
      'Access restricted to registered lending partners',
      403,
      'NOT_A_LENDING_PARTNER',
      'error.auth.not_lender',
    );
  }
  return id;
}

/**
 * @openapi
 * /api/v1/finance/lender/input-distributions:
 *   post:
 *     summary: Record an input distributed to a farmer by an NGO/grant institution
 *     tags: [Lender]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Distribution recorded
 *       403:
 *         description: Caller is not a registered lending partner
 */
export async function createInputDistributionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const dto = req.body as CreateInputDistributionDto;
    const distribution = await inputDistributionRepo.createInputDistribution(partnerBankId, dto);
    res.status(201).json({ data: distribution });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/finance/lender/input-distributions:
 *   get:
 *     summary: List inputs distributed by this institution, optionally filtered by date range
 *     tags: [Lender]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of input distributions
 *       403:
 *         description: Caller is not a registered lending partner
 */
export async function listInputDistributionsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const query = req.query as { from_date?: string; to_date?: string };
    const distributions = await inputDistributionRepo.findDistributionsByPartner(partnerBankId, {
      fromDate: query.from_date,
      toDate: query.to_date,
    });
    res.json({ data: distributions });
  } catch (err) {
    next(err);
  }
}
