import { Request, Response, NextFunction } from 'express';
import * as creditScoringService from '../../../src/services/creditScoringService';
import * as creditController from '../../../src/controllers/creditController';

jest.mock('../../../src/services/creditScoringService', () => ({
  computeScore: jest.fn(),
  getOrComputeScore: jest.fn(),
}));

const mockGetOrComputeScore = jest.mocked(creditScoringService.getOrComputeScore);
const mockComputeScore = jest.mocked(creditScoringService.computeScore);

const fakeScore = {
  score: 72,
  band: 'B' as const,
  maxLoanKes: 50000,
  seasonsOfData: 3,
  avgYieldScore: 70,
  inputManagementScore: 75,
  activityComplianceScore: 68,
  platformEngagementScore: 80,
};

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: { id: 'farmer-1', role: 'farmer', phone: '+254700000001' },
    headers: { authorization: 'Bearer test-token-abc' },
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('creditController.getCreditScore', () => {
  it('returns computed score as JSON', async () => {
    mockGetOrComputeScore.mockResolvedValue(fakeScore);

    const req = makeReq();
    const res = makeRes();

    await creditController.getCreditScore(req as never, res, next);

    expect(mockGetOrComputeScore).toHaveBeenCalledWith('farmer-1', 'test-token-abc');
    expect(res.json).toHaveBeenCalledWith({ data: fakeScore });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards errors to next', async () => {
    const err = new Error('service error');
    mockGetOrComputeScore.mockRejectedValue(err);

    const req = makeReq();
    const res = makeRes();

    await creditController.getCreditScore(req as never, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('strips Bearer prefix from authorization header', async () => {
    mockGetOrComputeScore.mockResolvedValue(fakeScore);

    const req = makeReq({ headers: { authorization: 'Bearer token-xyz' } });
    const res = makeRes();

    await creditController.getCreditScore(req as never, res, next);

    expect(mockGetOrComputeScore).toHaveBeenCalledWith('farmer-1', 'token-xyz');
  });
});

describe('creditController.recomputeCreditScore', () => {
  it('forces recomputation and returns result', async () => {
    mockComputeScore.mockResolvedValue(fakeScore);

    const req = makeReq();
    const res = makeRes();

    await creditController.recomputeCreditScore(req as never, res, next);

    expect(mockComputeScore).toHaveBeenCalledWith('farmer-1', 'test-token-abc');
    expect(res.json).toHaveBeenCalledWith({ data: fakeScore });
  });

  it('forwards errors to next', async () => {
    const err = new Error('recompute failed');
    mockComputeScore.mockRejectedValue(err);

    const req = makeReq();
    const res = makeRes();

    await creditController.recomputeCreditScore(req as never, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
