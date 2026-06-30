import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as docRepo from '../repositories/loanDocumentRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import { publishLoanApplied } from '../events/producers/loanAppliedProducer.js';
import { createError } from '../middleware/errorHandler.js';
import type { CreateLoanDto } from '../schemas/createLoan.schema.js';
import type { AddDocumentDto } from '../schemas/addDocument.schema.js';

// ── Loan response mapper ──────────────────────────────────────────────────────

const PARTNER_NAMES: Record<string, string> = {
  'partner-eq-001':  'Equity Bank Kenya',
  'partner-kcb-002': 'KCB Bank',
  'partner-fa-003':  'Faulu Kenya',
};

const PRODUCT_NAMES: Record<string, Record<string, string>> = {
  'partner-eq-001': {
    agricultural_working_capital: 'Equity Kilimo Loan',
    asset_finance:                'Equity Asset Finance',
  },
  'partner-kcb-002': {
    agricultural_working_capital: 'KCB Agri-Loan',
    emergency:                    'KCB Emergency Farm Loan',
  },
  'partner-fa-003': {
    back_to_school: 'Faulu Back-to-School Harvest Loan',
  },
};

type RawLoan = NonNullable<Awaited<ReturnType<typeof loanRepo.findLoanById>>>;

function mapLoan(loan: RawLoan) {
  const pid = loan.partnerBankId ?? null;
  const partnerName = pid ? (PARTNER_NAMES[pid] ?? pid) : 'Partner Bank';
  const productName = pid
    ? (PRODUCT_NAMES[pid]?.[loan.type] ?? 'Agricultural Loan')
    : 'Agricultural Loan';

  const timeline: Array<{ status: string; timestamp: string }> = [];
  if (loan.submittedAt) {
    timeline.push({ status: 'submitted', timestamp: loan.submittedAt.toISOString() });
  }
  if (loan.disbursedAt) {
    timeline.push({ status: 'disbursed', timestamp: loan.disbursedAt.toISOString() });
  }

  return {
    id:                  loan.id,
    productId:           pid ?? '',
    productName,
    partnerName,
    amountRequestedKes:  Number(loan.amountRequestedKes),
    purpose:             loan.purpose,
    repaymentMonths:     loan.repaymentMonths,
    status:              loan.status,
    approvedAmountKes:   loan.approvedAmountKes != null ? Number(loan.approvedAmountKes) : null,
    interestRate:        loan.interestRatePct != null ? Number(loan.interestRatePct) : null,
    disbursedAt:         loan.disbursedAt?.toISOString() ?? null,
    mpesaRef:            loan.mpesaDisbursementRef ?? null,
    submittedAt:         loan.submittedAt?.toISOString() ?? new Date().toISOString(),
    timeline,
  };
}

type LoanType = 'agricultural_working_capital' | 'back_to_school' | 'asset_finance' | 'emergency';

const PRODUCT_LOOKUP: Record<string, { type: LoanType; partnerBankId: string }> = {
  'prod-eq-wc-001':     { type: 'agricultural_working_capital', partnerBankId: 'partner-eq-001' },
  'prod-eq-af-002':     { type: 'asset_finance',                partnerBankId: 'partner-eq-001' },
  'prod-kcb-ag-003':    { type: 'agricultural_working_capital', partnerBankId: 'partner-kcb-002' },
  'prod-kcb-em-004':    { type: 'emergency',                    partnerBankId: 'partner-kcb-002' },
  'prod-fa-micro-005':  { type: 'agricultural_working_capital', partnerBankId: 'partner-fa-003' },
  'prod-fa-school-006': { type: 'back_to_school',               partnerBankId: 'partner-fa-003' },
};

export async function submitLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateLoanDto;
    const farmerId = req.user.id;

    const productInfo = dto.productId ? PRODUCT_LOOKUP[dto.productId] : null;
    const resolvedType: LoanType = productInfo?.type ?? dto.type ?? 'agricultural_working_capital';
    const resolvedPartnerBankId = productInfo?.partnerBankId ?? dto.partnerBankId;

    const creditScore = await creditScoreRepo.findCreditScore(farmerId);
    if (!creditScore) {
      throw createError(
        'No credit score found — call POST /finance/credit-score/compute first',
        422,
        'NO_CREDIT_SCORE',
        'error.finance.no_credit_score',
      );
    }

    if (dto.amountRequestedKes > Number(creditScore.maxLoanKes)) {
      throw createError(
        `Requested amount exceeds credit limit of ${creditScore.maxLoanKes} KES`,
        422,
        'EXCEEDS_CREDIT_LIMIT',
        'error.finance.exceeds_credit_limit',
      );
    }

    const loan = await loanRepo.createLoan(
      farmerId,
      Number(creditScore.score),
      creditScore.band as 'A' | 'B' | 'C' | 'D' | 'ineligible',
      {
        ...dto,
        farmId:       dto.farmId ?? '',
        type:         resolvedType,
        partnerBankId: resolvedPartnerBankId,
      },
    );

    await publishLoanApplied(
      loan.id,
      farmerId,
      dto.farmId ?? '',
      resolvedType,
      dto.amountRequestedKes,
    );

    res.status(201).json({ data: mapLoan(loan) });
  } catch (err) {
    next(err);
  }
}

export async function listLoans(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loans = await loanRepo.findLoansByFarmer(req.user.id);
    res.json({ data: loans.map(mapLoan) });
  } catch (err) {
    next(err);
  }
}

export async function getLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loan = await loanRepo.findLoanById(req.params['loanId'] as string);
    if (!loan || loan.farmerId !== req.user.id) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }
    const documents = await docRepo.findDocumentsByLoan(loan.id);
    res.json({ data: { ...mapLoan(loan), documents } });
  } catch (err) {
    next(err);
  }
}

export async function addDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loanId = req.params['loanId'] as string;
    const loan = await loanRepo.findLoanById(loanId);
    if (!loan || loan.farmerId !== req.user.id) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }
    const dto = req.body as AddDocumentDto;
    const doc = await docRepo.createDocument({ loanId, ...dto });
    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loanId = req.params['loanId'] as string;
    const loan = await loanRepo.findLoanById(loanId);
    if (!loan || loan.farmerId !== req.user.id) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }
    const documents = await docRepo.findDocumentsByLoan(loanId);
    res.json({ data: documents });
  } catch (err) {
    next(err);
  }
}

export async function cancelLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loan = await loanRepo.findLoanById(req.params['loanId'] as string);
    if (!loan || loan.farmerId !== req.user.id) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }
    if (!['draft', 'submitted', 'under_review'].includes(loan.status)) {
      throw createError(
        'Loan cannot be cancelled in its current state',
        422,
        'LOAN_CANNOT_CANCEL',
        'error.finance.loan_cannot_cancel',
      );
    }
    const updated = await loanRepo.cancelLoan(loan.id);
    res.json({ data: mapLoan(updated) });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const loanId = req.params['loanId'] as string;
    const loan = await loanRepo.findLoanById(loanId);
    if (!loan || loan.farmerId !== req.user.id) {
      throw createError('Loan not found', 404, 'LOAN_NOT_FOUND', 'error.finance.loan_not_found');
    }
    await docRepo.deleteDocument(req.params['docId'] as string, loanId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
