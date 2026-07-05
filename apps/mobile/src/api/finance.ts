import { apiFetch } from './client';

export type CreditBand = 'A' | 'B' | 'C' | 'D' | 'ineligible';

export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'cancelled'
  | 'repaid'
  | 'defaulted';

export type LoanCategory =
  | 'back_to_school'
  | 'farm_input'
  | 'asset_finance'
  | 'emergency'
  | 'general';

export type PartnerType = 'bank' | 'microfinance' | 'sacco';

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
  partnerType: PartnerType;
  category: LoanCategory;
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
  type: PartnerType;
  description: string | null;
  minLoanKes: number;
  maxLoanKes: number;
  processingDays: number;
}

export interface RepaymentScheduleItem {
  dueDate: string;
  principalKes: number;
  interestKes: number;
  totalKes: number;
  status: 'pending' | 'paid' | 'overdue';
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amountKes: number;
  category: string;
  linkedTo?: string;
  buyerSupplier?: string;
  date: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amountKes: number;
  category: string;
  linkedTo: string | null;
  buyerSupplier: string | null;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface ReportRange {
  fromDate?: string;
  toDate?: string;
}

export interface TransactionCategoryTotal {
  category: string;
  incomeKes: number;
  expenseKes: number;
}

export interface MonthlyTotal {
  month: string;
  incomeKes: number;
  expenseKes: number;
  netKes: number;
}

export interface CropHarvestTotal {
  cropName: string;
  harvestedKg: number;
  soldKg: number;
  revenueKes: number;
}

export interface AnimalProductTotal {
  productType: string;
  unit: string;
  totalQty: number;
  soldQty: number;
  revenueKes: number;
}

export interface CollectionTotal {
  productType: string;
  totalAmountKes: number;
  totalQty: number;
  unit: string;
}

export interface FarmerFinancialReport {
  farmerId: string;
  period: { fromDate: string | null; toDate: string | null };
  transactions: {
    totalIncomeKes: number;
    totalExpenseKes: number;
    netKes: number;
    recordCount: number;
    byCategory: TransactionCategoryTotal[];
    byMonth: MonthlyTotal[];
  };
  production: {
    cropHarvests: {
      totalHarvestedKg: number;
      totalSoldKg: number;
      totalRevenueKes: number;
      byCrop: CropHarvestTotal[];
    };
    animalProducts: {
      byType: AnimalProductTotal[];
    };
    collections: {
      totalSalesKes: number;
      paidKes: number;
      pendingKes: number;
      byProductType: CollectionTotal[];
    };
  };
  creditScore: {
    score: number;
    band: CreditBand;
    maxLoanKes: number;
    seasonsOfData: number;
    computedAt: string;
  } | null;
  generatedAt: string;
}

function reportQueryString(range?: ReportRange): string {
  const params = new URLSearchParams();
  if (range?.fromDate) params.set('from_date', range.fromDate);
  if (range?.toDate) params.set('to_date', range.toDate);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
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
    get: (productId: string) =>
      apiFetch<{ data: LoanProduct }>(`/finance/products/${productId}`),
  },
  transactions: {
    list: () => apiFetch<{ data: Transaction[] }>('/finance/transactions'),
    create: (dto: CreateTransactionDto) =>
      apiFetch<{ data: Transaction }>('/finance/transactions', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  },
  reports: {
    me: (range?: ReportRange) =>
      apiFetch<{ data: FarmerFinancialReport }>(`/finance/reports/me${reportQueryString(range)}`),
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
