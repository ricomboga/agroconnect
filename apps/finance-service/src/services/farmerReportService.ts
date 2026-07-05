import * as farmClient from '../clients/farmServiceClient.js';
import * as txRepo from '../repositories/transactionRepository.js';
import * as creditScoreRepo from '../repositories/creditScoreRepository.js';
import { logger } from '../logger.js';

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
  month: string; // YYYY-MM
  incomeKes: number;
  expenseKes: number;
  netKes: number;
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
  production: farmClient.ProductionSummary;
  creditScore: {
    score: number;
    band: string;
    maxLoanKes: number;
    seasonsOfData: number;
    breakdown: {
      harvestYieldScore: number;
      inputManagementScore: number;
      activityComplianceScore: number;
      platformEngagementScore: number;
    };
    computedAt: string;
  } | null;
  generatedAt: string;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function summarizeTransactions(
  rows: Array<{ type: string; amountKes: unknown; category: string; date: string }>,
) {
  let totalIncomeKes = 0;
  let totalExpenseKes = 0;
  const byCategoryMap = new Map<string, TransactionCategoryTotal>();
  const byMonthMap = new Map<string, MonthlyTotal>();

  for (const r of rows) {
    const amount = Number(r.amountKes);
    const month = r.date.slice(0, 7);

    if (r.type === 'income') totalIncomeKes += amount;
    else totalExpenseKes += amount;

    const catEntry = byCategoryMap.get(r.category) ?? { category: r.category, incomeKes: 0, expenseKes: 0 };
    if (r.type === 'income') catEntry.incomeKes += amount;
    else catEntry.expenseKes += amount;
    byCategoryMap.set(r.category, catEntry);

    const monthEntry = byMonthMap.get(month) ?? { month, incomeKes: 0, expenseKes: 0, netKes: 0 };
    if (r.type === 'income') monthEntry.incomeKes += amount;
    else monthEntry.expenseKes += amount;
    monthEntry.netKes = monthEntry.incomeKes - monthEntry.expenseKes;
    byMonthMap.set(month, monthEntry);
  }

  return {
    totalIncomeKes: round(totalIncomeKes),
    totalExpenseKes: round(totalExpenseKes),
    netKes: round(totalIncomeKes - totalExpenseKes),
    recordCount: rows.length,
    byCategory: [...byCategoryMap.values()]
      .map((c) => ({ ...c, incomeKes: round(c.incomeKes), expenseKes: round(c.expenseKes) }))
      .sort((a, b) => b.incomeKes + b.expenseKes - (a.incomeKes + a.expenseKes)),
    byMonth: [...byMonthMap.values()]
      .map((m) => ({ ...m, incomeKes: round(m.incomeKes), expenseKes: round(m.expenseKes), netKes: round(m.netKes) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function generateFarmerReport(
  farmerId: string,
  range: ReportRange = {},
): Promise<FarmerFinancialReport> {
  logger.info({ farmerId, range }, 'Generating farmer financial report');

  const [transactionRows, production, creditScore] = await Promise.all([
    txRepo.findTransactionsByFarmerInRange(farmerId, range),
    farmClient.getFarmerProductionSummary(farmerId, range),
    creditScoreRepo.findCreditScore(farmerId),
  ]);

  return {
    farmerId,
    period: { fromDate: range.fromDate ?? null, toDate: range.toDate ?? null },
    transactions: summarizeTransactions(transactionRows),
    production,
    creditScore: creditScore
      ? {
          score: Number(creditScore.score),
          band: creditScore.band,
          maxLoanKes: Number(creditScore.maxLoanKes),
          seasonsOfData: creditScore.seasonsOfData,
          breakdown: {
            harvestYieldScore: Number(creditScore.avgYieldScore),
            inputManagementScore: Number(creditScore.inputManagementScore),
            activityComplianceScore: Number(creditScore.activityComplianceScore),
            platformEngagementScore: Number(creditScore.platformEngagementScore),
          },
          computedAt: creditScore.computedAt.toISOString(),
        }
      : null,
    generatedAt: new Date().toISOString(),
  };
}
