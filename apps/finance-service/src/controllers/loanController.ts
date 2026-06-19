import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as loanRepo from '../repositories/loanRepository.js';
import * as docRepo from '../repositories/loanDocumentRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import { publishLoanApplied } from '../events/producers/loanAppliedProducer.js';
import { createError } from '../middleware/errorHandler.js';
import type { CreateLoanDto } from '../schemas/createLoan.schema.js';
import type { AddDocumentDto } from '../schemas/addDocument.schema.js';

export async function submitLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateLoanDto;
    const farmerId = req.user.id;

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
      dto,
    );

    await publishLoanApplied(
      loan.id,
      farmerId,
      dto.farmId,
      dto.type,
      dto.amountRequestedKes,
    );

    res.status(201).json({ data: loan });
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
    res.json({ data: loans });
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
    res.json({ data: { ...loan, documents } });
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
