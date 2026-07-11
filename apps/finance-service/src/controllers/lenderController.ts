import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
import * as farmerLenderAssignmentRepo from '../repositories/farmerLenderAssignmentRepository.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as inputDistributionRepo from '../repositories/inputDistributionRepository.js';
import * as farmerRosterService from '../services/farmerRosterService.js';
import * as farmerReportService from '../services/farmerReportService.js';
import { createError } from '../middleware/errorHandler.js';
import type { LenderStatusUpdateDto } from '../schemas/lenderStatusUpdate.schema.js';
import type { UpdateOperatingCountiesDto } from '../schemas/updateOperatingCounties.schema.js';

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
 * /api/v1/finance/lender/institution:
 *   get:
 *     summary: The lending institution the caller is registered under
 *     tags: [Lender]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Institution id, name and type (bank/microfinance/sacco/mobile_lender/ngo_grant)
 *       403:
 *         description: Caller is not a registered lending partner
 *       404:
 *         description: Institution not found
 */
export async function getLenderInstitution(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
    if (!partner) {
      throw createError('Institution not found', 404, 'PARTNER_NOT_FOUND', 'error.finance.partner_not_found');
    }

    res.json({ data: { id: partner.id, name: partner.name, type: partner.type, operatingCounties: partner.operatingCounties } });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/finance/lender/institution/operating-counties:
 *   patch:
 *     summary: Update the counties an NGO/grant institution operates in — determines their region-based farmer roster
 *     tags: [Lender]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated operating counties
 *       403:
 *         description: Caller is not a registered lending partner
 */
export async function updateLenderOperatingCounties(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const dto = req.body as UpdateOperatingCountiesDto;
    const updated = await loanPartnerRepo.updatePartner(partnerBankId, { operatingCounties: dto.operatingCounties });
    res.json({ data: { operatingCounties: updated.operatingCounties } });
  } catch (err) {
    next(err);
  }
}

export async function getLenderPipeline(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const [loans, farmersCount] = await Promise.all([
      loanRepo.findLoansByPartnerBank(partnerBankId),
      farmerLenderAssignmentRepo.countFarmersByLender(partnerBankId),
    ]);

    const counts = {
      submitted: loans.filter((l: { status: string }) => l.status === 'submitted').length,
      under_review: loans.filter((l: { status: string }) => l.status === 'under_review').length,
      approved: loans.filter((l: { status: string }) => l.status === 'approved').length,
      disbursed: loans.filter((l: { status: string }) => l.status === 'disbursed').length,
      defaulted: loans.filter((l: { status: string }) => l.status === 'defaulted').length,
    };

    res.json({ data: { loans, counts, farmersCount } });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/finance/admin/lenders/{partnerBankId}/summary:
 *   get:
 *     summary: Admin view of a lending institution's loan pipeline and farmer count
 *     tags: [Admin, Lender]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerBankId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Institution summary
 *       403:
 *         description: Caller is not an admin
 *       404:
 *         description: Institution not found
 */
export async function getLenderSummaryForAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = req.params['partnerBankId'] as string;

    const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
    if (!partner) {
      throw createError('Institution not found', 404, 'PARTNER_NOT_FOUND', 'error.finance.partner_not_found');
    }

    const [loans, farmersCount] = await Promise.all([
      loanRepo.findLoansByPartnerBank(partnerBankId),
      farmerLenderAssignmentRepo.countFarmersByLender(partnerBankId),
    ]);

    const counts = {
      submitted: loans.filter((l: { status: string }) => l.status === 'submitted').length,
      under_review: loans.filter((l: { status: string }) => l.status === 'under_review').length,
      approved: loans.filter((l: { status: string }) => l.status === 'approved').length,
      disbursed: loans.filter((l: { status: string }) => l.status === 'disbursed').length,
      rejected: loans.filter((l: { status: string }) => l.status === 'rejected').length,
      repaid: loans.filter((l: { status: string }) => l.status === 'repaid').length,
      defaulted: loans.filter((l: { status: string }) => l.status === 'defaulted').length,
      cancelled: loans.filter((l: { status: string }) => l.status === 'cancelled').length,
    };

    const totalDisbursedKes = loans
      .filter((l: { status: string }) => l.status === 'disbursed' || l.status === 'repaid')
      .reduce((sum: number, l: { approvedAmountKes: unknown }) => sum + Number(l.approvedAmountKes ?? 0), 0);

    res.json({
      data: {
        institution: {
          id: partner.id,
          name: partner.name,
          type: partner.type,
          repaymentRatePct: Number(partner.repaymentRatePct),
        },
        farmersCount,
        counts,
        totalDisbursedKes,
      },
    });
  } catch (err) {
    next(err);
  }
}

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year as number, (month as number) - 1, 1).toLocaleDateString('en-KE', { month: 'short' });
}

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @openapi
 * /api/v1/finance/lender/dashboard:
 *   get:
 *     summary: Monthly trend summary for the lender dashboard (loans disbursed, farmers onboarded, loans rejected)
 *     tags: [Reports, Lender]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Last 6 months of disbursement, onboarding and rejection trends
 *       403:
 *         description: Caller is not a registered lending partner
 */
export async function getLenderDashboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
    const isNgo = partner?.type === 'ngo_grant';

    const months = lastNMonthKeys(6);

    if (isNgo) {
      const roster = await farmerRosterService.getNgoRegionRoster(partnerBankId);
      const farmerIds = roster.map((r) => r.farmerId);

      const onboardedByMonth = new Map<string, number>();
      for (const key of months) onboardedByMonth.set(key, 0);
      for (const r of roster) {
        // "Onboarded" here means the farmer's earliest farm registration date, since NGOs
        // have no discrete assignment event — they cover a region, not individual farmers.
        const key = monthKeyOf(new Date(r.firstRegisteredAt));
        if (onboardedByMonth.has(key)) onboardedByMonth.set(key, (onboardedByMonth.get(key) ?? 0) + 1);
      }
      const farmersOnboardedByMonth = months.map((key) => ({ month: monthLabel(key), count: onboardedByMonth.get(key) ?? 0 }));

      const earliestMonth = months[0] as string;
      const [transactions, distributions] = await Promise.all([
        transactionRepo.findTransactionsByFarmerIdsInRange(farmerIds, { fromDate: `${earliestMonth}-01` }),
        inputDistributionRepo.findDistributionsByPartner(partnerBankId, { fromDate: `${earliestMonth}-01` }),
      ]);

      const incomeByMonth = new Map<string, { incomeKes: number; expenseKes: number }>();
      for (const key of months) incomeByMonth.set(key, { incomeKes: 0, expenseKes: 0 });
      for (const tx of transactions as { type: string; amountKes: unknown; date: string }[]) {
        const key = tx.date.slice(0, 7);
        const bucket = incomeByMonth.get(key);
        if (!bucket) continue;
        if (tx.type === 'income') bucket.incomeKes += Number(tx.amountKes);
        else bucket.expenseKes += Number(tx.amountKes);
      }

      const distributionByMonth = new Map<string, { count: number; valueKes: number }>();
      for (const key of months) distributionByMonth.set(key, { count: 0, valueKes: 0 });
      for (const d of distributions as { distributedAt: Date; valueKes: unknown }[]) {
        const key = monthKeyOf(d.distributedAt);
        const bucket = distributionByMonth.get(key);
        if (!bucket) continue;
        bucket.count += 1;
        bucket.valueKes += Number(d.valueKes);
      }

      res.json({
        data: {
          farmersOnboardedByMonth,
          incomeExpenseByMonth: months.map((key) => ({
            month: monthLabel(key),
            incomeKes: incomeByMonth.get(key)?.incomeKes ?? 0,
            expenseKes: incomeByMonth.get(key)?.expenseKes ?? 0,
          })),
          inputDistributionByMonth: months.map((key) => ({
            month: monthLabel(key),
            count: distributionByMonth.get(key)?.count ?? 0,
            valueKes: distributionByMonth.get(key)?.valueKes ?? 0,
          })),
        },
      });
      return;
    }

    const [loans, assignments] = await Promise.all([
      loanRepo.findLoansByPartnerBank(partnerBankId),
      farmerLenderAssignmentRepo.findAssignmentsByLender(partnerBankId),
    ]);

    const onboardedByMonth = new Map<string, number>();
    const disbursedByMonth = new Map<string, { count: number; amountKes: number }>();
    const rejectedByMonth = new Map<string, number>();
    for (const key of months) {
      onboardedByMonth.set(key, 0);
      disbursedByMonth.set(key, { count: 0, amountKes: 0 });
      rejectedByMonth.set(key, 0);
    }
    for (const assignment of assignments as { assignedAt: Date }[]) {
      const key = monthKeyOf(assignment.assignedAt);
      if (onboardedByMonth.has(key)) onboardedByMonth.set(key, (onboardedByMonth.get(key) ?? 0) + 1);
    }
    const farmersOnboardedByMonth = months.map((key) => ({ month: monthLabel(key), count: onboardedByMonth.get(key) ?? 0 }));

    for (const loan of loans as { status: string; disbursedAt: Date | null; approvedAmountKes: unknown; updatedAt: Date }[]) {
      if (loan.status === 'disbursed' || loan.status === 'repaid') {
        if (loan.disbursedAt) {
          const key = monthKeyOf(loan.disbursedAt);
          const bucket = disbursedByMonth.get(key);
          if (bucket) {
            bucket.count += 1;
            bucket.amountKes += Number(loan.approvedAmountKes ?? 0);
          }
        }
      } else if (loan.status === 'rejected') {
        // No rejectedAt column on LoanApplication — updatedAt is the closest proxy since the
        // status transition to 'rejected' is what last touched the row.
        const key = monthKeyOf(loan.updatedAt);
        if (rejectedByMonth.has(key)) rejectedByMonth.set(key, (rejectedByMonth.get(key) ?? 0) + 1);
      }
    }

    res.json({
      data: {
        farmersOnboardedByMonth,
        loansDisbursedByMonth: months.map((key) => ({
          month: monthLabel(key),
          count: disbursedByMonth.get(key)?.count ?? 0,
          amountKes: disbursedByMonth.get(key)?.amountKes ?? 0,
        })),
        loansRejectedByMonth: months.map((key) => ({ month: monthLabel(key), count: rejectedByMonth.get(key) ?? 0 })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getLenderLoanDetail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const loanId = req.params['loanId'] as string;

    const loan = await loanRepo.findLoanByIdForLender(loanId, partnerBankId);
    if (!loan) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }

    const creditScore = await creditScoreRepo.findCreditScore(loan.farmerId);

    res.json({ data: { loan, creditScore: creditScore ?? null } });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/finance/lender/loans/{loanId}/report:
 *   get:
 *     summary: Comprehensive financial + production report for the applicant on a loan
 *     tags: [Reports, Lender]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
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
 *         description: Farmer financial report for the loan applicant
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Caller is not a registered lending partner
 *       404:
 *         description: Loan not found or not owned by this partner bank
 */
export async function getLenderFarmerReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const loanId = req.params['loanId'] as string;

    const loan = await loanRepo.findLoanByIdForLender(loanId, partnerBankId);
    if (!loan) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }

    const query = req.query as { from_date?: string; to_date?: string };
    const report = await farmerReportService.generateFarmerReport(loan.farmerId, {
      fromDate: query.from_date,
      toDate: query.to_date,
    });

    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}

export async function updateLoanStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const loanId = req.params['loanId'] as string;
    const dto = req.body as LenderStatusUpdateDto;

    const loan = await loanRepo.findLoanByIdForLender(loanId, partnerBankId);
    if (!loan) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }

    const updated = await loanRepo.updateLoanStatusByLender(loanId, dto);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
