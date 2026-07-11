import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as authClient from '../clients/authServiceClient.js';
import * as farmClient from '../clients/farmServiceClient.js';
import * as farmerRosterService from '../services/farmerRosterService.js';
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

async function resolveFarmerIds(req: AuthenticatedRequest, partnerBankId: string): Promise<string[]> {
  const raw = req.query['farmer_ids'] as string | undefined;
  const explicitIds = raw ? raw.split(',').filter(Boolean) : undefined;
  return farmerRosterService.resolveFarmerIds(partnerBankId, explicitIds);
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * @openapi
 * /api/v1/finance/lender/reports/farmers:
 *   get:
 *     summary: Downloadable farmer list report (name, county, sub-county, acreage, farmer type) for all farmers linked to this institution
 *     tags: [Reports, Lender]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmer_ids
 *         schema: { type: string }
 *         description: Optional comma-separated override of the farmer roster to report on
 *     responses:
 *       200:
 *         description: Farmer list report rows
 *       403:
 *         description: Caller is not a registered lending partner
 */
export async function getFarmersListReportHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const farmerIds = await resolveFarmerIds(req, partnerBankId);

    const [profiles, farmProfiles] = await Promise.all([
      authClient.getUserProfiles(farmerIds),
      farmClient.getFarmProfilesByOwners(farmerIds),
    ]);

    const rows = farmerIds.map((farmerId) => {
      const profile = profiles[farmerId];
      const farm = farmProfiles[farmerId];
      return {
        farmerId,
        // No nationalId/ID-number field exists on the User model today (only a KYC
        // "national_id" *document* upload, not a stored ID string) — surfaced as null
        // until that field is added.
        idNumber: null,
        fullName: profile?.fullName ?? null,
        county: farm?.county ?? profile?.county ?? null,
        subCounty: farm?.subCounty ?? profile?.subCounty ?? null,
        areaAcres: farm?.areaAcres ?? null,
        farmerType: farm?.farmType ?? null,
      };
    });

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/finance/lender/reports/income-statement:
 *   get:
 *     summary: Combined income statement (total income, total expenses, net income) across all farmers linked to this institution
 *     tags: [Reports, Lender]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmer_ids
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Per-farmer income statement rows and combined totals
 *       403:
 *         description: Caller is not a registered lending partner
 */
export async function getIncomeStatementReportHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const farmerIds = await resolveFarmerIds(req, partnerBankId);
    const query = req.query as { from_date?: string; to_date?: string };

    const [transactions, profiles] = await Promise.all([
      transactionRepo.findTransactionsByFarmerIdsInRange(farmerIds, {
        fromDate: query.from_date,
        toDate: query.to_date,
      }),
      authClient.getUserProfiles(farmerIds),
    ]);

    const totalsByFarmer = new Map<string, { incomeKes: number; expenseKes: number }>();
    for (const farmerId of farmerIds) totalsByFarmer.set(farmerId, { incomeKes: 0, expenseKes: 0 });
    for (const tx of transactions as { farmerId: string; type: string; amountKes: unknown }[]) {
      const bucket = totalsByFarmer.get(tx.farmerId);
      if (!bucket) continue;
      if (tx.type === 'income') bucket.incomeKes += Number(tx.amountKes);
      else bucket.expenseKes += Number(tx.amountKes);
    }

    const rows = farmerIds.map((farmerId) => {
      const totals = totalsByFarmer.get(farmerId) ?? { incomeKes: 0, expenseKes: 0 };
      return {
        farmerId,
        fullName: profiles[farmerId]?.fullName ?? null,
        totalIncomeKes: round(totals.incomeKes),
        totalExpenseKes: round(totals.expenseKes),
        netIncomeKes: round(totals.incomeKes - totals.expenseKes),
      };
    });

    const combined = rows.reduce(
      (acc, r) => ({
        totalIncomeKes: acc.totalIncomeKes + r.totalIncomeKes,
        totalExpenseKes: acc.totalExpenseKes + r.totalExpenseKes,
        netIncomeKes: acc.netIncomeKes + r.netIncomeKes,
      }),
      { totalIncomeKes: 0, totalExpenseKes: 0, netIncomeKes: 0 },
    );

    res.json({
      data: {
        period: { fromDate: query.from_date ?? null, toDate: query.to_date ?? null },
        rows,
        combined: {
          totalIncomeKes: round(combined.totalIncomeKes),
          totalExpenseKes: round(combined.totalExpenseKes),
          netIncomeKes: round(combined.netIncomeKes),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
