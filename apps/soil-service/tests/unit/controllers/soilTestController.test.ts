import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/types/index';

jest.mock('../../../src/services/soilTestService', () => ({
  createSoilTest: jest.fn(),
  listSoilTests: jest.fn(),
  getRecommendation: jest.fn(),
}));

import * as soilTestService from '../../../src/services/soilTestService';
import * as soilTestController from '../../../src/controllers/soilTestController';

const mockCreateSoilTest = jest.mocked(soilTestService.createSoilTest);
const mockListSoilTests = jest.mocked(soilTestService.listSoilTests);
const mockGetRecommendation = jest.mocked(soilTestService.getRecommendation);

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    user: { id: 'farmer-001', role: 'farmer', phone: '+254712345678', isVerified: true },
    params: { farmId: 'farm-uuid-001' },
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

const fakeTest = {
  id: 'test-uuid-001',
  farmId: 'farm-uuid-001',
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

beforeEach(() => jest.clearAllMocks());

// ─── createSoilTest ───────────────────────────────────────────────────────────

describe('soilTestController.createSoilTest', () => {
  it('returns 201 with the created test', async () => {
    mockCreateSoilTest.mockResolvedValue(fakeTest as never);
    const req = makeReq({ body: { testedAt: '2025-03-15', ph: 6.5 } });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await soilTestController.createSoilTest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeTest });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when service throws', async () => {
    const err = new Error('DB error');
    mockCreateSoilTest.mockRejectedValue(err);
    const req = makeReq({ body: { testedAt: '2025-03-15', ph: 6.5 } });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await soilTestController.createSoilTest(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── listSoilTests ────────────────────────────────────────────────────────────

describe('soilTestController.listSoilTests', () => {
  it('returns 200 with tests and meta including trend', async () => {
    mockListSoilTests.mockResolvedValue({
      tests: [fakeTest],
      total: 1,
      trend: { ph: 'stable' },
    } as never);
    const req = makeReq({ query: { page: '1', page_size: '20' } });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await soilTestController.listSoilTests(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: [fakeTest],
      meta: { total: 1, page: 1, page_size: 20, trend: { ph: 'stable' } },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when service throws', async () => {
    const err = new Error('Service error');
    mockListSoilTests.mockRejectedValue(err);
    const req = makeReq({ query: {} });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await soilTestController.listSoilTests(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── getRecommendation ────────────────────────────────────────────────────────

describe('soilTestController.getRecommendation', () => {
  it('returns 200 with recommendations and meta', async () => {
    const fakeRec = {
      nutrient: 'pH',
      status: 'low',
      recommendation: 'Apply lime',
      product_name: 'Agricultural Lime',
      rate_kg_per_acre: 2000,
      supplier_product_id: null,
    };
    mockGetRecommendation.mockResolvedValue({
      recommendations: [fakeRec],
      latestTest: fakeTest,
    } as never);
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await soilTestController.getRecommendation(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: [fakeRec],
      meta: {
        based_on_test_id: 'test-uuid-001',
        tested_at: fakeTest.testedAt,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when service throws 404', async () => {
    const err = new Error('Not found');
    (err as Error & { statusCode: number }).statusCode = 404;
    mockGetRecommendation.mockRejectedValue(err);
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await soilTestController.getRecommendation(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
