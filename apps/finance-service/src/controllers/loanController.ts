import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as docRepo from '../repositories/loanDocumentRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import * as productRepo from '../repositories/loanProductRepository.js';
import { publishLoanApplied } from '../events/producers/loanAppliedProducer.js';
import { createError } from '../middleware/errorHandler.js';
import type { CreateLoanDto } from '../schemas/createLoan.schema.js';
import type { AddDocumentDto } from '../schemas/addDocument.schema.js';

// ── Loan response mapper ──────────────────────────────────────────────────────

type RawLoan = NonNullable<Awaited<ReturnType<typeof loanRepo.findLoanById>>>;

function mapLoan(loan: RawLoan, partnerName = 'Partner Bank', productName = 'Agricultural Loan') {
  const timeline: Array<{ status: string; timestamp: string }> = [];
  if (loan.submittedAt) {
    timeline.push({ status: 'submitted', timestamp: loan.submittedAt.toISOString() });
  }
  if (loan.disbursedAt) {
    timeline.push({ status: 'disbursed', timestamp: loan.disbursedAt.toISOString() });
  }

  return {
    id:                  loan.id,
    productId:           loan.partnerBankId ?? '',
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

async function resolveProductInfo(productId: string | undefined, dto: CreateLoanDto) {
  if (productId) {
    const product = await productRepo.findProductById(productId);
    if (product) {
      return {
        type:          product.category === 'back_to_school' ? ('back_to_school' as const)
                     : product.category === 'asset_finance'  ? ('asset_finance' as const)
                     : product.category === 'emergency'       ? ('emergency' as const)
                     : ('agricultural_working_capital' as const),
        partnerBankId: product.partnerId,
        partnerName:   product.partner.name,
        productName:   product.name,
      };
    }
  }
  return {
    type:          (dto.type ?? 'agricultural_working_capital') as 'agricultural_working_capital' | 'back_to_school' | 'asset_finance' | 'emergency',
    partnerBankId: dto.partnerBankId,
    partnerName:   'Partner Bank',
    productName:   'Agricultural Loan',
  };
}

async function resolveMapNames(loan: RawLoan) {
  if (loan.partnerBankId) {
    const products = await productRepo.findAllProducts();
    const match = products.find(
      (p: { partnerId: string; category: string }) => p.partnerId === loan.partnerBankId &&
             (p.category === 'back_to_school' ? loan.type === 'back_to_school'
              : p.category === 'asset_finance' ? loan.type === 'asset_finance'
              : p.category === 'emergency'      ? loan.type === 'emergency'
              : loan.type === 'agricultural_working_capital'),
    );
    return {
      partnerName: match?.partner.name ?? loan.partnerBankId,
      productName: match?.name ?? 'Agricultural Loan',
    };
  }
  return { partnerName: 'Partner Bank', productName: 'Agricultural Loan' };
}

export async function submitLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateLoanDto;
    const farmerId = req.user.id;

    const { type: resolvedType, partnerBankId: resolvedPartnerBankId, partnerName, productName } =
      await resolveProductInfo(dto.productId, dto);

    // Credit score is computed for the lending partner's internal review only —
    // it is not shown to farmers and must never block submission of an application.
    const creditScore = await creditScoreRepo.findCreditScore(farmerId);

    const loan = await loanRepo.createLoan(
      farmerId,
      creditScore ? Number(creditScore.score) : null,
      creditScore ? (creditScore.band as 'A' | 'B' | 'C' | 'D' | 'ineligible') : null,
      {
        ...dto,
        farmId:        dto.farmId ?? '',
        type:          resolvedType,
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

    res.status(201).json({ data: mapLoan(loan, partnerName, productName) });
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
    const data = await Promise.all(
      loans.map(async (loan: RawLoan) => {
        const { partnerName, productName } = await resolveMapNames(loan);
        return mapLoan(loan, partnerName, productName);
      }),
    );
    res.json({ data });
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
    const [{ partnerName, productName }, documents] = await Promise.all([
      resolveMapNames(loan),
      docRepo.findDocumentsByLoan(loan.id),
    ]);
    res.json({ data: { ...mapLoan(loan, partnerName, productName), documents } });
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
