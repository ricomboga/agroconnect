import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
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

export async function getLenderPipeline(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const partnerBankId = requirePartnerBankId(req);
    const loans = await loanRepo.findLoansByPartnerBank(partnerBankId);

    const counts = {
      submitted: loans.filter((l) => l.status === 'submitted').length,
      under_review: loans.filter((l) => l.status === 'under_review').length,
      approved: loans.filter((l) => l.status === 'approved').length,
      disbursed: loans.filter((l) => l.status === 'disbursed').length,
      defaulted: loans.filter((l) => l.status === 'defaulted').length,
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
