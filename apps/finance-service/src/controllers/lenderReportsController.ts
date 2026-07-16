import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
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
    const [farmerIds, rosterConfigured] = await Promise.all([
      resolveFarmerIds(req, partnerBankId),
      farmerRosterService.isRosterConfigured(partnerBankId),
    ]);

    const [profiles, farmProfiles] = await Promise.all([
      authClient.getUserProfiles(farmerIds),
      farmClient.getFarmProfilesByOwners(farmerIds),
    ]);

    const rows = farmerIds.map((farmerId) => {
      const profile = profiles[farmerId];
      const farm = farmProfiles[farmerId];
      return {
        farmerId,
        idNumber: profile?.idNumber ?? null,
        fullName: profile?.fullName ?? null,
        phone: profile?.phone ?? null,
        county: farm?.county ?? profile?.county ?? null,
        subCounty: farm?.subCounty ?? profile?.subCounty ?? null,
        areaAcres: farm?.areaAcres ?? null,
        farmerType: farm?.farmType ?? null,
      };
    });

    res.json({ data: rows, rosterConfigured });
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
    const [farmerIds, rosterConfigured] = await Promise.all([
      resolveFarmerIds(req, partnerBankId),
      farmerRosterService.isRosterConfigured(partnerBankId),
    ]);
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
        rosterConfigured,
      },
    });
  } catch (err) {
    next(err);
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * @openapi
 * /api/v1/finance/lender/farmer-reports/{farmerId}/credit:
 *   get:
 *     summary: Credit score, loan history, and 30-day cash flow for one farmer in this lender's roster
 *     tags: [Reports, Lender]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credit + loan + cash-flow snapshot for the farmer
 *       403:
 *         description: Caller is not a registered lending partner, or the farmer is outside their roster
 */
export async function getFarmerCreditReportHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const farmerId = req.params['farmerId'] as string;

    const roster = await farmerRosterService.resolveFarmerIds(partnerBankId);
    if (!roster.includes(farmerId)) {
      throw createError('Farmer is not in your roster', 403, 'FARMER_NOT_IN_ROSTER', 'error.auth.forbidden');
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const [creditScoreRow, loans, last30DaysTx] = await Promise.all([
      creditScoreRepo.findCreditScore(farmerId),
      loanRepo.findLoansByFarmer(farmerId),
      transactionRepo.findTransactionsByFarmerInRange(farmerId, { fromDate }),
    ]);

    const partnerIds = [
      ...new Set(
        loans.map((l: { partnerBankId: string | null }) => l.partnerBankId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const partners = await Promise.all(partnerIds.map((id: string) => loanPartnerRepo.findPartnerById(id)));
    const partnerNameById = new Map(
      partners.filter(Boolean).map((p) => [(p as { id: string }).id, (p as { name: string }).name]),
    );

    const cashFlow = (last30DaysTx as { type: string; amountKes: unknown }[]).reduce(
      (acc: { incomeKes: number; expenseKes: number }, tx: { type: string; amountKes: unknown }) => {
        const amount = Number(tx.amountKes);
        if (tx.type === 'income') acc.incomeKes += amount;
        else acc.expenseKes += amount;
        return acc;
      },
      { incomeKes: 0, expenseKes: 0 },
    );

    res.json({
      data: {
        creditScore: creditScoreRow
          ? {
              score: creditScoreRow.score,
              band: creditScoreRow.band,
              maxLoanKes: round2(Number(creditScoreRow.maxLoanKes)),
              seasonsOfData: creditScoreRow.seasonsOfData,
              breakdown: {
                harvestYieldScore: creditScoreRow.avgYieldScore,
                inputManagementScore: creditScoreRow.inputManagementScore,
                activityComplianceScore: creditScoreRow.activityComplianceScore,
                platformEngagementScore: creditScoreRow.platformEngagementScore,
              },
            }
          : null,
        loans: (
          loans as {
            partnerBankId: string | null;
            approvedAmountKes: unknown;
            amountRequestedKes: unknown;
            status: string;
            disbursedAt: Date | null;
            repaymentMonths: number;
          }[]
        ).map((l) => ({
          lender: (l.partnerBankId && partnerNameById.get(l.partnerBankId)) ?? 'Unknown lender',
          amountKes: round2(Number(l.approvedAmountKes ?? l.amountRequestedKes)),
          status: l.status,
          disbursedAt: l.disbursedAt ? l.disbursedAt.toISOString() : null,
          termMonths: l.repaymentMonths,
        })),
        cashFlow: {
          last30DaysIncomeKes: round2(cashFlow.incomeKes),
          last30DaysExpensesKes: round2(cashFlow.expenseKes),
          last30DaysNetKes: round2(cashFlow.incomeKes - cashFlow.expenseKes),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
