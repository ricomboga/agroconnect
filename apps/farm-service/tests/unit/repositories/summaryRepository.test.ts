/**
 * Summary repository tests verify:
 *   - Each aggregate is a single Prisma call (not per-row fan-out).
 *   - The correct _sum fields are requested.
 *   - An optional date range is forwarded correctly.
 */
import * as summaryRepo from '../../../src/repositories/summaryRepository';

const mockInputAggregate = jest.fn();
const mockActivityAggregate = jest.fn();
const mockHarvestAggregate = jest.fn();

jest.mock('@agroconnect/db/farm', () => ({
  prisma: {
    input: {
      aggregate: (...args: unknown[]) => mockInputAggregate(...args),
    },
    activity: {
      aggregate: (...args: unknown[]) => mockActivityAggregate(...args),
    },
    harvest: {
      aggregate: (...args: unknown[]) => mockHarvestAggregate(...args),
    },
  },
  Prisma: {},
}));

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// aggregateInputCosts
// ---------------------------------------------------------------------------
describe('summaryRepository.aggregateInputCosts — N+1 prevention', () => {
  it('executes exactly one aggregate query regardless of how many rows exist', async () => {
    mockInputAggregate.mockResolvedValue({ _sum: { totalCostKes: 45000 } });

    const result = await summaryRepo.aggregateInputCosts('farm-uuid-001');

    expect(mockInputAggregate).toHaveBeenCalledTimes(1);
    expect(result).toBe(45000);
  });

  it('requests _sum.totalCostKes', async () => {
    mockInputAggregate.mockResolvedValue({ _sum: { totalCostKes: 0 } });

    await summaryRepo.aggregateInputCosts('farm-uuid-001');

    expect(mockInputAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ _sum: { totalCostKes: true } }),
    );
  });

  it('returns 0 when there are no inputs (null _sum)', async () => {
    mockInputAggregate.mockResolvedValue({ _sum: { totalCostKes: null } });

    const result = await summaryRepo.aggregateInputCosts('farm-uuid-001');

    expect(result).toBe(0);
  });

  it('forwards the date range to the where clause', async () => {
    mockInputAggregate.mockResolvedValue({ _sum: { totalCostKes: 0 } });
    const range = { gte: new Date('2025-01-01'), lte: new Date('2025-12-31') };

    await summaryRepo.aggregateInputCosts('farm-uuid-001', range);

    expect(mockInputAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ appliedDate: range }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// aggregateLabourCosts
// ---------------------------------------------------------------------------
describe('summaryRepository.aggregateLabourCosts — N+1 prevention', () => {
  it('executes exactly one aggregate query', async () => {
    mockActivityAggregate.mockResolvedValue({ _sum: { labourCostKes: 12000 } });

    const result = await summaryRepo.aggregateLabourCosts('farm-uuid-001');

    expect(mockActivityAggregate).toHaveBeenCalledTimes(1);
    expect(result).toBe(12000);
  });

  it('requests _sum.labourCostKes', async () => {
    mockActivityAggregate.mockResolvedValue({ _sum: { labourCostKes: 0 } });

    await summaryRepo.aggregateLabourCosts('farm-uuid-001');

    expect(mockActivityAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ _sum: { labourCostKes: true } }),
    );
  });

  it('returns 0 when no activities have labour costs', async () => {
    mockActivityAggregate.mockResolvedValue({ _sum: { labourCostKes: null } });
    expect(await summaryRepo.aggregateLabourCosts('farm-uuid-001')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// aggregateHarvests
// ---------------------------------------------------------------------------
describe('summaryRepository.aggregateHarvests — N+1 prevention', () => {
  it('executes exactly one aggregate query', async () => {
    mockHarvestAggregate.mockResolvedValue({
      _sum: { quantityKg: 1200, totalRevenueKes: 96000 },
    });

    const result = await summaryRepo.aggregateHarvests('farm-uuid-001');

    expect(mockHarvestAggregate).toHaveBeenCalledTimes(1);
    expect(result.totalYieldKg).toBe(1200);
    expect(result.totalRevenueKes).toBe(96000);
  });

  it('requests both _sum fields in a single call', async () => {
    mockHarvestAggregate.mockResolvedValue({ _sum: { quantityKg: 0, totalRevenueKes: 0 } });

    await summaryRepo.aggregateHarvests('farm-uuid-001');

    expect(mockHarvestAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ _sum: { quantityKg: true, totalRevenueKes: true } }),
    );
  });

  it('returns 0 for both fields when there are no harvests (null _sum)', async () => {
    mockHarvestAggregate.mockResolvedValue({ _sum: { quantityKg: null, totalRevenueKes: null } });

    const result = await summaryRepo.aggregateHarvests('farm-uuid-001');

    expect(result.totalYieldKg).toBe(0);
    expect(result.totalRevenueKes).toBe(0);
  });
});
