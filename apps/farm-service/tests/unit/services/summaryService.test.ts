import * as farmRepo from '../../../src/repositories/farmRepository';
import * as summaryRepo from '../../../src/repositories/summaryRepository';
import * as summaryService from '../../../src/services/summaryService';

jest.mock('../../../src/repositories/farmRepository', () => ({ findFarmById: jest.fn() }));
jest.mock('../../../src/repositories/summaryRepository', () => ({
  aggregateInputCosts: jest.fn(),
  aggregateLabourCosts: jest.fn(),
  aggregateHarvests: jest.fn(),
}));

const mockFindFarmById = jest.mocked(farmRepo.findFarmById);
const mockAggregateInputCosts = jest.mocked(summaryRepo.aggregateInputCosts);
const mockAggregateLabourCosts = jest.mocked(summaryRepo.aggregateLabourCosts);
const mockAggregateHarvests = jest.mocked(summaryRepo.aggregateHarvests);

const fakeFarm = { id: 'farm-001', ownerId: 'owner-001', county: 'Kiambu', status: 'active', plots: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockFindFarmById.mockResolvedValue(fakeFarm as never);
  mockAggregateInputCosts.mockResolvedValue(30000 as never);
  mockAggregateLabourCosts.mockResolvedValue(12000 as never);
  mockAggregateHarvests.mockResolvedValue({ totalYieldKg: 1500, totalRevenueKes: 90000 } as never);
});

describe('summaryService.getFarmSummary', () => {
  it('computes profitEstimateKes = revenue − (inputCosts + labourCosts)', async () => {
    const result = await summaryService.getFarmSummary('farm-001', 'owner-001', 'farmer');

    expect(result.totalInputCostsKes).toBe(30000);
    expect(result.totalLabourCostsKes).toBe(12000);
    expect(result.totalCostsKes).toBe(42000);
    expect(result.totalRevenueKes).toBe(90000);
    expect(result.profitEstimateKes).toBe(48000); // 90000 - 42000
  });

  it('returns totalYieldKg from harvest aggregate', async () => {
    const result = await summaryService.getFarmSummary('farm-001', 'owner-001', 'farmer');
    expect(result.totalYieldKg).toBe(1500);
  });

  it('throws 404 FARM_NOT_FOUND when farm does not exist', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      summaryService.getFarmSummary('ghost-farm', 'owner-001', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });
  });

  it('uses undefined ownerId for admin path', async () => {
    await summaryService.getFarmSummary('farm-001', 'admin-uuid', 'admin');

    expect(mockFindFarmById).toHaveBeenCalledWith('farm-001', undefined);
  });

  it('runs all three aggregates in parallel — each called exactly once', async () => {
    await summaryService.getFarmSummary('farm-001', 'owner-001', 'farmer');

    expect(mockAggregateInputCosts).toHaveBeenCalledTimes(1);
    expect(mockAggregateLabourCosts).toHaveBeenCalledTimes(1);
    expect(mockAggregateHarvests).toHaveBeenCalledTimes(1);
  });

  it('forwards dateRange to all three aggregates when from_date and to_date are provided', async () => {
    await summaryService.getFarmSummary('farm-001', 'owner-001', 'farmer', '2025-01-01', '2025-12-31');

    const expectedRange = { gte: new Date('2025-01-01'), lte: new Date('2025-12-31') };
    expect(mockAggregateInputCosts).toHaveBeenCalledWith('farm-001', expectedRange);
    expect(mockAggregateLabourCosts).toHaveBeenCalledWith('farm-001', expectedRange);
    expect(mockAggregateHarvests).toHaveBeenCalledWith('farm-001', expectedRange);
  });

  it('includes dateRange in response when provided', async () => {
    const result = await summaryService.getFarmSummary(
      'farm-001', 'owner-001', 'farmer', '2025-01-01', '2025-12-31',
    );

    expect(result.dateRange).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('omits dateRange from response when not provided', async () => {
    const result = await summaryService.getFarmSummary('farm-001', 'owner-001', 'farmer');
    expect(result.dateRange).toBeUndefined();
  });

  it('reports a negative profitEstimateKes when costs exceed revenue', async () => {
    mockAggregateInputCosts.mockResolvedValue(80000 as never);
    mockAggregateLabourCosts.mockResolvedValue(20000 as never);
    mockAggregateHarvests.mockResolvedValue({ totalYieldKg: 500, totalRevenueKes: 40000 } as never);

    const result = await summaryService.getFarmSummary('farm-001', 'owner-001', 'farmer');

    expect(result.profitEstimateKes).toBe(-60000); // 40000 - 100000
  });
});
