import * as soilTestRepo from '../../../src/repositories/soilTestRepository';
import * as soilTestService from '../../../src/services/soilTestService';

jest.mock('../../../src/repositories/soilTestRepository', () => ({
  createSoilTest: jest.fn(),
  findSoilTests: jest.fn(),
  countSoilTests: jest.fn(),
  findRecentSoilTests: jest.fn(),
  findLatestSoilTest: jest.fn(),
}));

jest.mock('../../../src/services/recommendationService', () => ({
  buildRecommendations: jest.fn().mockResolvedValue([
    {
      nutrient: 'pH',
      status: 'low',
      recommendation: 'Apply lime',
      product_name: 'Agricultural Lime',
      rate_kg_per_acre: 2000,
      supplier_product_id: null,
    },
  ]),
}));

const mockCreateSoilTest = jest.mocked(soilTestRepo.createSoilTest);
const mockFindSoilTests = jest.mocked(soilTestRepo.findSoilTests);
const mockCountSoilTests = jest.mocked(soilTestRepo.countSoilTests);
const mockFindRecentSoilTests = jest.mocked(soilTestRepo.findRecentSoilTests);
const mockFindLatestSoilTest = jest.mocked(soilTestRepo.findLatestSoilTest);

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

const dto = { testedAt: '2025-03-15', ph: 6.5 };

beforeEach(() => jest.clearAllMocks());

// ─── createSoilTest ───────────────────────────────────────────────────────────

describe('soilTestService.createSoilTest', () => {
  it('delegates to repository', async () => {
    mockCreateSoilTest.mockResolvedValue(fakeTest as never);

    const result = await soilTestService.createSoilTest('farm-001', 'farmer-001', dto);

    expect(mockCreateSoilTest).toHaveBeenCalledWith('farm-001', 'farmer-001', dto);
    expect(result.id).toBe('test-uuid-001');
  });
});

// ─── listSoilTests ────────────────────────────────────────────────────────────

describe('soilTestService.listSoilTests', () => {
  it('returns tests, total, and trend for a farmer (scoped by farmerId)', async () => {
    mockFindSoilTests.mockResolvedValue([fakeTest] as never);
    mockCountSoilTests.mockResolvedValue(1);
    mockFindRecentSoilTests.mockResolvedValue([fakeTest] as never);

    const result = await soilTestService.listSoilTests('farm-001', 'farmer-001', 'farmer', {
      take: 20,
      skip: 0,
    });

    expect(result.tests).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindSoilTests).toHaveBeenCalledWith('farm-001', 'farmer-001', { take: 20, skip: 0 });
  });

  it('passes undefined farmerId for admin (sees all farm tests)', async () => {
    mockFindSoilTests.mockResolvedValue([fakeTest, fakeTest] as never);
    mockCountSoilTests.mockResolvedValue(2);
    mockFindRecentSoilTests.mockResolvedValue([fakeTest, fakeTest] as never);

    await soilTestService.listSoilTests('farm-001', 'admin-uuid', 'admin', { take: 20, skip: 0 });

    expect(mockFindSoilTests).toHaveBeenCalledWith('farm-001', undefined, { take: 20, skip: 0 });
  });

  it('returns trend null when fewer than 2 tests', async () => {
    mockFindSoilTests.mockResolvedValue([fakeTest] as never);
    mockCountSoilTests.mockResolvedValue(1);
    mockFindRecentSoilTests.mockResolvedValue([fakeTest] as never);

    const result = await soilTestService.listSoilTests('farm-001', 'farmer-001', 'farmer', {
      take: 20,
      skip: 0,
    });

    expect(result.trend.ph).toBeNull();
  });

  it('returns improving when pH moves closer to optimal centre', async () => {
    const older = { ...fakeTest, ph: '4.50' }; // further from 6.75
    const newer = { ...fakeTest, ph: '5.80' }; // closer to 6.75
    mockFindSoilTests.mockResolvedValue([newer, older] as never);
    mockCountSoilTests.mockResolvedValue(2);
    mockFindRecentSoilTests.mockResolvedValue([newer, older] as never);

    const result = await soilTestService.listSoilTests('farm-001', 'farmer-001', 'farmer', {
      take: 20,
      skip: 0,
    });

    expect(result.trend.ph).toBe('improving');
  });

  it('returns declining when pH moves away from optimal centre', async () => {
    const older = { ...fakeTest, ph: '6.80' }; // close to 6.75
    const newer = { ...fakeTest, ph: '8.50' }; // far from 6.75
    mockFindSoilTests.mockResolvedValue([newer, older] as never);
    mockCountSoilTests.mockResolvedValue(2);
    mockFindRecentSoilTests.mockResolvedValue([newer, older] as never);

    const result = await soilTestService.listSoilTests('farm-001', 'farmer-001', 'farmer', {
      take: 20,
      skip: 0,
    });

    expect(result.trend.ph).toBe('declining');
  });

  it('returns stable when pH change is less than 0.1 from centre', async () => {
    const older = { ...fakeTest, ph: '6.70' };
    const newer = { ...fakeTest, ph: '6.75' };
    mockFindSoilTests.mockResolvedValue([newer, older] as never);
    mockCountSoilTests.mockResolvedValue(2);
    mockFindRecentSoilTests.mockResolvedValue([newer, older] as never);

    const result = await soilTestService.listSoilTests('farm-001', 'farmer-001', 'farmer', {
      take: 20,
      skip: 0,
    });

    expect(result.trend.ph).toBe('stable');
  });
});

// ─── getRecommendation ────────────────────────────────────────────────────────

describe('soilTestService.getRecommendation', () => {
  it('returns recommendations based on the latest test', async () => {
    mockFindLatestSoilTest.mockResolvedValue(fakeTest as never);

    const result = await soilTestService.getRecommendation('farm-001', 'farmer-001', 'farmer');

    expect(result.recommendations).toHaveLength(1);
    expect(result.latestTest.id).toBe('test-uuid-001');
  });

  it('throws 404 SOIL_TEST_NOT_FOUND when no tests exist', async () => {
    mockFindLatestSoilTest.mockResolvedValue(null);

    await expect(
      soilTestService.getRecommendation('farm-001', 'farmer-001', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'SOIL_TEST_NOT_FOUND' });
  });

  it('uses undefined farmerId for admin', async () => {
    mockFindLatestSoilTest.mockResolvedValue(fakeTest as never);

    await soilTestService.getRecommendation('farm-001', 'admin-uuid', 'admin');

    expect(mockFindLatestSoilTest).toHaveBeenCalledWith('farm-001', undefined);
  });
});
