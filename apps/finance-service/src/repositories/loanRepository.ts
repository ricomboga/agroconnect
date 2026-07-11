import { prisma } from '@agroconnect/db/finance';
import type { CreateLoanDto } from '../schemas/createLoan.schema.js';
import type { CreditBand } from '../scoring/computeScore.js';
import type { LenderStatusUpdateDto } from '../schemas/lenderStatusUpdate.schema.js';

export async function createLoan(
  farmerId: string,
  creditScore: number | null,
  creditBand: CreditBand | null,
  dto: CreateLoanDto,
) {
  return prisma.loanApplication.create({
    data: {
      farmerId,
      farmId: dto.farmId ?? '',
      type: dto.type ?? 'agricultural_working_capital',
      amountRequestedKes: dto.amountRequestedKes,
      purpose: dto.purpose,
      repaymentMonths: dto.repaymentMonths,
      partnerBankId: dto.partnerBankId,
      farmGpsLat: dto.farmGpsLat,
      farmGpsLng: dto.farmGpsLng,
      creditScore,
      creditBand,
      status: 'submitted',
      submittedAt: new Date(),
    },
  });
}

export async function findLoansByFarmer(farmerId: string) {
  return prisma.loanApplication.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findLoanById(loanId: string) {
  return prisma.loanApplication.findUnique({ where: { id: loanId } });
}

export async function updateLoanDisbursed(loanId: string, mpesaRef: string) {
  return prisma.loanApplication.update({
    where: { id: loanId },
    data: { status: 'disbursed', mpesaDisbursementRef: mpesaRef, disbursedAt: new Date() },
  });
}

export async function updateLoanFailed(loanId: string, reason: string) {
  return prisma.loanApplication.update({
    where: { id: loanId },
    data: { status: 'rejected', rejectionReason: reason },
  });
}

export async function cancelLoan(loanId: string) {
  return prisma.loanApplication.update({
    where: { id: loanId },
    data: { status: 'cancelled' },
  });
}

export async function findLoansByPartnerBank(partnerBankId: string) {
  return prisma.loanApplication.findMany({
    where: { partnerBankId },
    orderBy: [{ submittedAt: 'desc' }],
  });
}

export async function findLoanByIdForLender(loanId: string, partnerBankId: string) {
  return prisma.loanApplication.findFirst({
    where: { id: loanId, partnerBankId },
  });
}

export async function updateLoanStatusByLender(loanId: string, dto: LenderStatusUpdateDto) {
  return prisma.loanApplication.update({
    where: { id: loanId },
    data: {
      status: dto.status,
      ...(dto.approved_amount_kes !== undefined && { approvedAmountKes: dto.approved_amount_kes }),
      ...(dto.interest_rate_pct !== undefined && { interestRatePct: dto.interest_rate_pct }),
      ...(dto.rejection_reason !== undefined && { rejectionReason: dto.rejection_reason }),
    },
  });
}
