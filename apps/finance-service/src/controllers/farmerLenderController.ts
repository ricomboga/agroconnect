import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { upsertFarmerLenderAssignment } from '../repositories/farmerLenderAssignmentRepository.js';
import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
import * as authClient from '../clients/authServiceClient.js';
import { createError } from '../middleware/errorHandler.js';
import type { AssignLenderDto } from '../schemas/assignLender.schema.js';
import type { BulkAssignLenderDto } from '../schemas/bulkAssignLender.schema.js';

export async function assignLender(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { lenderId } = req.body as AssignLenderDto;
    const assignment = await upsertFarmerLenderAssignment(id, lenderId);
    res.json({ data: assignment });
  } catch (err) {
    next(err);
  }
}

export type BulkAssignRowStatus = 'assigned' | 'not_found' | 'not_a_farmer';

export interface BulkAssignRowResult {
  identifier: string;
  status: BulkAssignRowStatus;
  fullName?: string;
}

/**
 * Bulk farmer-to-lender assignment (CSV upload) — each identifier is a phone
 * number or National ID from the uploaded file. Every row is resolved and
 * reported individually so the admin UI can show exactly which rows failed
 * and why, rather than the whole batch succeeding or failing as one unit.
 */
export async function bulkAssignLender(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { lenderId, identifiers } = req.body as BulkAssignLenderDto;

    const partner = await loanPartnerRepo.findPartnerById(lenderId);
    if (!partner) {
      throw createError('Lender/NGO not found', 404, 'PARTNER_NOT_FOUND', 'error.finance.partner_not_found');
    }

    const uniqueIdentifiers = [...new Set(identifiers.map((i) => i.trim()).filter(Boolean))];
    const resolved = await authClient.resolveUsersByIdentifiers(uniqueIdentifiers);

    const results: BulkAssignRowResult[] = [];
    for (const identifier of uniqueIdentifiers) {
      const match = resolved[identifier];
      if (!match) {
        results.push({ identifier, status: 'not_found' });
        continue;
      }
      if (match.role !== 'farmer') {
        results.push({ identifier, status: 'not_a_farmer', fullName: match.fullName });
        continue;
      }
      await upsertFarmerLenderAssignment(match.id, lenderId);
      results.push({ identifier, status: 'assigned', fullName: match.fullName });
    }

    res.json({
      data: {
        assignedCount: results.filter((r) => r.status === 'assigned').length,
        results,
      },
    });
  } catch (err) {
    next(err);
  }
}
