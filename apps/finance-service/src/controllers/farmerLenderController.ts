import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import {
  upsertFarmerLenderAssignment,
  findAssignmentsByFarmerIds,
} from '../repositories/farmerLenderAssignmentRepository.js';
import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
import * as authClient from '../clients/authServiceClient.js';
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

/**
 * For a set of farmer IDs, reports which ones already have a lender/NGO/Group
 * assignment (and its name) — powers the "NGO/Group" column + assigned/
 * unassigned flag on the admin farmer list, so the admin never needs to open
 * each farmer individually to know.
 */
export async function getFarmerLenderMap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const farmerIds = String(req.query['farmerIds'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (farmerIds.length === 0) { res.json({ data: {} }); return; }

    const assignments = (await findAssignmentsByFarmerIds(farmerIds)) as { farmerId: string; lenderId: string }[];
    const lenderIds: string[] = [...new Set(assignments.map((a) => a.lenderId))];
    const partners = await loanPartnerRepo.findPartnersByIds(lenderIds);
    const partnerById = new Map<string, string>(
      partners.map((p: { id: string; name: string }) => [p.id, p.name]),
    );

    const data: Record<string, { lenderId: string; lenderName: string }> = {};
    for (const a of assignments) {
      const lenderName = partnerById.get(a.lenderId);
      if (lenderName) data[a.farmerId] = { lenderId: a.lenderId, lenderName };
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export type BulkAssignRowStatus = 'assigned' | 'not_found' | 'not_a_farmer' | 'lender_not_found';

export interface BulkAssignRowResult {
  identifier: string;
  lenderName: string;
  status: BulkAssignRowStatus;
  fullName?: string;
}

/**
 * Bulk farmer-to-lender assignment (CSV upload) — each row is a farmer
 * identifier (phone/National ID) paired with the NGO/Group/lender name to
 * assign them to, so one file can target multiple institutions at once.
 * Every row is resolved and reported individually so the admin UI can show
 * exactly which rows failed and why, rather than the whole batch succeeding
 * or failing as one unit.
 */
export async function bulkAssignLender(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { rows } = req.body as BulkAssignLenderDto;

    const partners = await loanPartnerRepo.findAllPartners();
    const partnerByName = new Map<string, { id: string; name: string }>(
      partners.map((p: { id: string; name: string }) => [p.name.trim().toLowerCase(), p]),
    );

    const uniqueIdentifiers = [...new Set(rows.map((r) => r.identifier.trim()).filter(Boolean))];
    const resolved = await authClient.resolveUsersByIdentifiers(uniqueIdentifiers);

    const results: BulkAssignRowResult[] = [];
    for (const row of rows) {
      const identifier = row.identifier.trim();
      const lenderName = row.lenderName.trim();
      const partner = partnerByName.get(lenderName.toLowerCase());
      if (!partner) {
        results.push({ identifier, lenderName, status: 'lender_not_found' });
        continue;
      }

      const match = resolved[identifier];
      if (!match) {
        results.push({ identifier, lenderName, status: 'not_found' });
        continue;
      }
      if (match.role !== 'farmer') {
        results.push({ identifier, lenderName, status: 'not_a_farmer', fullName: match.fullName });
        continue;
      }
      await upsertFarmerLenderAssignment(match.id, partner.id);
      results.push({ identifier, lenderName, status: 'assigned', fullName: match.fullName });
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
