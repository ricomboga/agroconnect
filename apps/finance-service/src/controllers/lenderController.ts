import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
import * as farmerReportService from '../services/farmerReportService.js';
import { createError } from '../middleware/errorHandler.js';
import type { LenderStatusUpdateDto } from '../schemas/lenderStatusUpdate.schema.js';

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

    res.json({ data: { id: partner.id, name: partner.name, type: partner.type } });
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
    const loans = await loanRepo.findLoansByPartnerBank(partnerBankId);

    const counts = {
      submitted: loans.filter((l: { status: string }) => l.status === 'submitted').length,
      under_review: loans.filter((l: { status: string }) => l.status === 'under_review').length,
      approved: loans.filter((l: { status: string }) => l.status === 'approved').length,
      disbursed: loans.filter((l: { status: string }) => l.status === 'disbursed').length,
      defaulted: loans.filter((l: { status: string }) => l.status === 'defaulted').length,
    };

    res.json({ data: { loans, counts } });
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
