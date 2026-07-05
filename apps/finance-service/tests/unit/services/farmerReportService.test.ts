import * as farmClient from '../../../src/clients/farmServiceClient';
import * as txRepo from '../../../src/repositories/transactionRepository';
import * as creditScoreRepo from '../../../src/repositories/creditScoreRepository';
import * as farmerReportService from '../../../src/services/farmerReportService';

jest.mock('../../../src/clients/farmServiceClient', () => ({
  getFarmerProductionSummary: jest.fn(),
}));
jest.mock('../../../src/repositories/transactionRepository', () => ({
  findTransactionsByFarmerInRange: jest.fn(),
}));
jest.mock('../../../src/repositories/creditScoreRepository', () => ({
  findCreditScore: jest.fn(),
}));

const mockGetFarmerProductionSummary = jest.mocked(farmClient.getFarmerProductionSummary);
const mockFindTransactionsByFarmerInRange = jest.mocked(txRepo.findTransactionsByFarmerInRange);
const mockFindCreditScore = jest.mocked(creditScoreRepo.findCreditScore);

const fakeProduction = {
  cropHarvests: { totalHarvestedKg: 100, totalSoldKg: 80, totalRevenueKes: 8000, byCrop: [] },
  animalProducts: { byType: [] },
  collections: { totalSalesKes: 0, paidKes: 0, pendingKes: 0, byProductType: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFarmerProductionSummary.mockResolvedValue(fakeProduction);
  mockFindCreditScore.mockResolvedValue(null);
  mockFindTransactionsByFarmerInRange.mockResolvedValue([]);
});

describe('farmerReportService.generateFarmerReport', () => {
  it('sums income and expense transactions into totals and net', async () => {
    mockFindTransactionsByFarmerInRange.mockResolvedValue([
      { type: 'income', amountKes: '5000', category: 'crop_sale', date: '2026-01-15' },
      { type: 'income', amountKes: '3000', category: 'milk_sale', date: '2026-02-01' },
      { type: 'expense', amountKes: '1500', category: 'seeds', date: '2026-01-20' },
    ] as never);

    const report = await farmerReportService.generateFarmerReport('farmer-1');

    expect(report.transactions.totalIncomeKes).toBe(8000);
    expect(report.transactions.totalExpenseKes).toBe(1500);
    expect(report.transactions.netKes).toBe(6500);
    expect(report.transactions.recordCount).toBe(3);
  });

  it('groups transactions by category', async () => {
    mockFindTransactionsByFarmerInRange.mockResolvedValue([
      { type: 'income', amountKes: '5000', category: 'crop_sale', date: '2026-01-15' },
      { type: 'expense', amountKes: '1000', category: 'crop_sale', date: '2026-01-16' },
      { type: 'expense', amountKes: '500', category: 'labour', date: '2026-01-17' },
    ] as never);

    const report = await farmerReportService.generateFarmerReport('farmer-1');

    expect(report.transactions.byCategory).toEqual(
      expect.arrayContaining([
        { category: 'crop_sale', incomeKes: 5000, expenseKes: 1000 },
        { category: 'labour', incomeKes: 0, expenseKes: 500 },
      ]),
    );
  });

  it('groups transactions by month (YYYY-MM) with net per month', async () => {
    mockFindTransactionsByFarmerInRange.mockResolvedValue([
      { type: 'income', amountKes: '2000', category: 'crop_sale', date: '2026-01-15' },
      { type: 'expense', amountKes: '500', category: 'seeds', date: '2026-01-20' },
      { type: 'income', amountKes: '1000', category: 'egg_sale', date: '2026-02-05' },
    ] as never);

    const report = await farmerReportService.generateFarmerReport('farmer-1');

    expect(report.transactions.byMonth).toEqual([
      { month: '2026-01', incomeKes: 2000, expenseKes: 500, netKes: 1500 },
      { month: '2026-02', incomeKes: 1000, expenseKes: 0, netKes: 1000 },
    ]);
  });

  it('includes the production summary from farm-service verbatim', async () => {
    const report = await farmerReportService.generateFarmerReport('farmer-1');
    expect(report.production).toEqual(fakeProduction);
  });

  it('returns creditScore null when no score has been computed yet', async () => {
    const report = await farmerReportService.generateFarmerReport('farmer-1');
    expect(report.creditScore).toBeNull();
  });

  it('includes the cached credit score when present', async () => {
    mockFindCreditScore.mockResolvedValue({
      score: '72', band: 'B', maxLoanKes: '50000', seasonsOfData: 3,
      avgYieldScore: '21', inputManagementScore: '18',
      activityComplianceScore: '20', platformEngagementScore: '14',
      computedAt: new Date('2026-06-01T00:00:00.000Z'),
    } as never);

    const report = await farmerReportService.generateFarmerReport('farmer-1');

    expect(report.creditScore).toEqual({
      score: 72, band: 'B', maxLoanKes: 50000, seasonsOfData: 3,
      breakdown: {
        harvestYieldScore: 21, inputManagementScore: 18,
        activityComplianceScore: 20, platformEngagementScore: 14,
      },
      computedAt: '2026-06-01T00:00:00.000Z',
    });
  });

  it('forwards the requested date range to transactions and production queries', async () => {
    await farmerReportService.generateFarmerReport('farmer-1', { fromDate: '2026-01-01', toDate: '2026-06-30' });

    expect(mockFindTransactionsByFarmerInRange).toHaveBeenCalledWith('farmer-1', {
      fromDate: '2026-01-01', toDate: '2026-06-30',
    });
    expect(mockGetFarmerProductionSummary).toHaveBeenCalledWith('farmer-1', {
      fromDate: '2026-01-01', toDate: '2026-06-30',
    });
  });

  it('echoes the requested period back on the report', async () => {
    const report = await farmerReportService.generateFarmerReport('farmer-1', {
      fromDate: '2026-01-01', toDate: '2026-06-30',
    });
    expect(report.period).toEqual({ fromDate: '2026-01-01', toDate: '2026-06-30' });
  });

  it('defaults period to null when no range is given', async () => {
    const report = await farmerReportService.generateFarmerReport('farmer-1');
    expect(report.period).toEqual({ fromDate: null, toDate: null });
  });
});
