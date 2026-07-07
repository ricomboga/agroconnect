/**
 * Repository tests focus on two things:
 *   1. Correct Prisma call arguments (especially `include` to prevent N+1).
 *   2. The admin-bypass: ownerId is omitted from the where clause when undefined.
 */
import * as farmRepo from '../../../src/repositories/farmRepository';

const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('@agroconnect/db/farm', () => ({
  prisma: {
    farm: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
  Prisma: {},
}));

const fakeFarm = {
  id: 'farm-uuid-001',
  ownerId: 'owner-uuid-001',
  name: 'Wanjiru Farm',
  county: 'Meru',
  status: 'active',
};

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// N+1 guard — findFarmById must include plots in a single query
// ---------------------------------------------------------------------------
describe('farmRepository.findFarmById — N+1 prevention', () => {
  it('fetches plots in the same Prisma query via include, not a separate call', async () => {
    mockFindFirst.mockResolvedValue(null);

    await farmRepo.findFarmById('farm-uuid-001', 'owner-uuid-001');

    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ include: { plots: true } }),
    );
  });

  it('does not make any additional Prisma calls beyond findFirst', async () => {
    mockFindFirst.mockResolvedValue({ ...fakeFarm, plots: [] });

    await farmRepo.findFarmById('farm-uuid-001', 'owner-uuid-001');

    // Only the one findFirst — no separate plot query
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Admin bypass — ownerId filter
// ---------------------------------------------------------------------------
describe('farmRepository.findFarmById — ownership filter', () => {
  it('scopes query to ownerId when provided (farmer path)', async () => {
    mockFindFirst.mockResolvedValue(fakeFarm);

    await farmRepo.findFarmById('farm-uuid-001', 'owner-uuid-001');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-uuid-001' }) }),
    );
  });

  it('omits ownerId from where clause when undefined (admin path)', async () => {
    mockFindFirst.mockResolvedValue(fakeFarm);

    await farmRepo.findFarmById('farm-uuid-001');

    const callArg = mockFindFirst.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).not.toHaveProperty('ownerId');
    expect(callArg.where).toHaveProperty('id', 'farm-uuid-001');
  });
});

describe('farmRepository.findFarmsByOwner — ownership filter', () => {
  it('filters by ownerId for a farmer', async () => {
    mockFindMany.mockResolvedValue([]);

    await farmRepo.findFarmsByOwner('owner-uuid-001', { take: 20, skip: 0 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-uuid-001' }) }),
    );
  });

  it('does not filter by ownerId when undefined (admin path)', async () => {
    mockFindMany.mockResolvedValue([]);

    await farmRepo.findFarmsByOwner(undefined, { take: 20, skip: 0 });

    const callArg = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).not.toHaveProperty('ownerId');
  });

  it('calls findMany exactly once regardless of result size', async () => {
    const farms = Array.from({ length: 50 }, (_, i) => ({ ...fakeFarm, id: `farm-${i}` }));
    mockFindMany.mockResolvedValue(farms);

    await farmRepo.findFarmsByOwner('owner-uuid-001', { take: 50, skip: 0 });

    // N+1 guard: one query for 50 records, not 50 queries
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});

describe('farmRepository.countFarmsByOwner — ownership filter', () => {
  it('scopes count to ownerId for farmers', async () => {
    mockCount.mockResolvedValue(3);

    await farmRepo.countFarmsByOwner('owner-uuid-001');

    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-uuid-001' }) }),
    );
  });

  it('omits ownerId for admin (count all farms)', async () => {
    mockCount.mockResolvedValue(150);

    await farmRepo.countFarmsByOwner(undefined);

    const callArg = mockCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(callArg.where).not.toHaveProperty('ownerId');
  });
});

describe('farmRepository.createFarm', () => {
  it('creates a farm and includes the ownerId', async () => {
    mockCreate.mockResolvedValue({ ...fakeFarm, id: 'new-farm' });

    const dto = {
      name: 'New Farm',
      locationLat: -0.5,
      locationLng: 36.8,
      county: 'Nakuru' as const,
      areaAcres: 3,
    };

    await farmRepo.createFarm('owner-uuid-001', dto);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'owner-uuid-001', name: 'New Farm' }),
      }),
    );
  });
});

describe('farmRepository.softDeleteFarm', () => {
  it('sets status to sold rather than hard-deleting', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });

    await farmRepo.softDeleteFarm('farm-uuid-001', 'owner-uuid-001');

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'sold' } }),
    );
  });
});
