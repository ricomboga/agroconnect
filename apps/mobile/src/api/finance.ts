import { apiFetch } from './client';

export type CreditBand = 'A' | 'B' | 'C' | 'D';

export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'cancelled';

export interface ScoreComponent {
  score: number;
  weight: number;
}

export interface CreditScore {
  score: number;
  band: CreditBand;
  maxLoanKes: number;
  lastComputedAt: string;
  components: {
    yield: ScoreComponent;
    inputs: ScoreComponent;
    activities: ScoreComponent;
    platform: ScoreComponent;
  };
}

export interface LoanProduct {
  id: string;
  name: string;
  partnerId: string;
  partnerName: string;
  interestRate: number;
  maxAmountKes: number;
  minAmountKes: number;
  repaymentMonths: number;
  eligibilityBand: CreditBand;
  description: string | null;
}

export interface LoanTimeline {
  status: LoanStatus;
  timestamp: string;
}

export interface LoanApplication {
  id: string;
  productId: string;
  productName: string;
  partnerName: string;
  amountRequestedKes: number;
  purpose: string;
  repaymentMonths: number;
  status: LoanStatus;
  approvedAmountKes: number | null;
  interestRate: number | null;
  disbursedAt: string | null;
  mpesaRef: string | null;
  submittedAt: string;
  timeline: LoanTimeline[];
}

export interface CreateLoanDto {
  productId: string;
  amountRequestedKes: number;
  purpose: string;
  repaymentMonths: number;
}

export interface LoanPartner {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string;
  contactPhone: string | null;
  website: string | null;
}

export interface RepaymentScheduleItem {
  dueDate: string;
  principalKes: number;
  interestKes: number;
  totalKes: number;
  status: 'pending' | 'paid' | 'overdue';
}

export const financeApi = {
  creditScore: {
    get: () => apiFetch<{ data: CreditScore }>('/finance/credit-score'),
    compute: () =>
      apiFetch<{ data: CreditScore }>('/finance/credit-score/compute', { method: 'POST' }),
  },
  partners: {
    list: () => apiFetch<{ data: LoanPartner[] }>('/finance/partners'),
  },
  products: {
    list: () => apiFetch<{ data: LoanProduct[] }>('/finance/products'),
  },
  loans: {
    list: () => apiFetch<{ data: LoanApplication[] }>('/finance/loans'),
    get: (id: string) => apiFetch<{ data: LoanApplication }>(`/finance/loans/${id}`),
    create: (dto: CreateLoanDto) =>
      apiFetch<{ data: LoanApplication }>('/finance/loans', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    cancel: (id: string) =>
      apiFetch<{ data: LoanApplication }>(`/finance/loans/${id}/cancel`, { method: 'POST' }),
    repayments: (id: string) =>
      apiFetch<{ data: RepaymentScheduleItem[] }>(`/finance/loans/${id}/repayments`),
  },
};
