import * as soilTestRepo from '../../../src/repositories/soilTestRepository';

jest.mock('@agroconnect/db/soil', () => ({
  prisma: {
    soilTest: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '@agroconnect/db/soil';

const mockCreate = jest.mocked(prisma.soilTest.create);
const mockFindMany = jest.mocked(prisma.soilTest.findMany);
const mockCount = jest.mocked(prisma.soilTest.count);
const mockFindFirst = jest.mocked(prisma.soilTest.findFirst);

const fakeTest = {
  id: 'test-uuid-001',
  farmId: 'farm-001',
  farmerId: 'farmer-001',
  plotId: null,
  testedAt: new Date('2025-03-15'),
  ph: '6.50',
  nitrogenPpm: null,
  phosphorusPpm: null,
  potassiumPpm: null,
  organicMatterPct: null,
  labName: null,
  notes: null,
  createdAt: new Date('2025-03-15'),
};

const dto = {
  testedAt: '2025-03-15',
  ph: 6.5,
};

const pagination = { take: 20, skip: 0 };

beforeEach(() => jest.clearAllMocks());

describe('createSoilTest', () => {
  it('calls prisma.soilTest.create with correct data', async () => {
    mockCreate.mockResolvedValue(fakeTest as never);
    const result = await soilTestRepo.createSoilTest('farm-001', 'farmer-001', dto);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ farmId: 'farm-001', farmerId: 'farmer-001' }) }),
    );
    expect(result.id).toBe('test-uuid-001');
  });
});

describe('findSoilTests', () => {
  it('scopes query by farmerId when provided', async () => {
    mockFindMany.mockResolvedValue([fakeTest] as never);
    await soilTestRepo.findSoilTests('farm-001', 'farmer-001', pagination);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { farmId: 'farm-001', farmerId: 'farmer-001' } }),
    );
  });

  it('omits farmerId filter when undefined (admin)', async () => {
    mockFindMany.mockResolvedValue([fakeTest] as never);
    await soilTestRepo.findSoilTests('farm-001', undefined, pagination);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { farmId: 'farm-001' } }),
    );
  });
});

describe('countSoilTests', () => {
  it('returns count', async () => {
    mockCount.mockResolvedValue(3);
    const count = await soilTestRepo.countSoilTests('farm-001', 'farmer-001');
    expect(count).toBe(3);
  });
});

describe('findRecentSoilTests', () => {
  it('fetches the requested limit ordered desc', async () => {
    mockFindMany.mockResolvedValue([fakeTest, fakeTest] as never);
    const result = await soilTestRepo.findRecentSoilTests('farm-001', 'farmer-001', 2);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2, orderBy: { testedAt: 'desc' } }),
    );
    expect(result).toHaveLength(2);
  });
});

describe('findLatestSoilTest', () => {
  it('returns the most recent test', async () => {
    mockFindFirst.mockResolvedValue(fakeTest as never);
    const result = await soilTestRepo.findLatestSoilTest('farm-001', 'farmer-001');
    expect(result?.id).toBe('test-uuid-001');
  });

  it('returns null when no tests exist', async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await soilTestRepo.findLatestSoilTest('farm-001', 'farmer-001');
    expect(result).toBeNull();
  });
});
