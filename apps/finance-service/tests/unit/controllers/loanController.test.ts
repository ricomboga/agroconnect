import { Response, NextFunction } from 'express';
import * as loanRepo from '../../../src/repositories/loanRepository';
import * as creditScoreRepo from '../../../src/repositories/creditScoreRepository';
import * as loanController from '../../../src/controllers/loanController';

jest.mock('../../../src/repositories/loanRepository', () => ({
  createLoan: jest.fn(),
  findLoansByFarmer: jest.fn(),
  findLoanById: jest.fn(),
}));

jest.mock('../../../src/repositories/creditScoreRepository', () => ({
  upsertCreditScore: jest.fn(),
  findCreditScore: jest.fn(),
}));

jest.mock('../../../src/events/producers/loanAppliedProducer', () => ({
  publishLoanApplied: jest.fn().mockResolvedValue(undefined),
}));

const mockCreateLoan = jest.mocked(loanRepo.createLoan);
const mockFindLoansByFarmer = jest.mocked(loanRepo.findLoansByFarmer);
const mockFindLoanById = jest.mocked(loanRepo.findLoanById);
const mockFindCreditScore = jest.mocked(creditScoreRepo.findCreditScore);

const fakeCreditScore = {
  farmerId: 'farmer-1',
  score: '75',
  band: 'B',
  maxLoanKes: '50000',
  seasonsOfData: 3,
  avgYieldScore: '70',
  inputManagementScore: '75',
  activityComplianceScore: '68',
  platformEngagementScore: '80',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeLoan = {
  id: 'loan-1',
  farmerId: 'farmer-1',
  farmId: 'farm-1',
  type: 'input_finance',
  amountRequestedKes: 30000,
  creditScoreAtApplication: 75,
  status: 'pending',
  createdAt: new Date(),
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'farmer-1', role: 'farmer', phone: '+254700000001' },
    headers: { authorization: 'Bearer token' },
    body: {},
    params: {},
    ...overrides,
  };
}

function makeRes(): Response {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('loanController.submitLoan', () => {
  it('creates loan and responds 201 when credit score is sufficient', async () => {
    mockFindCreditScore.mockResolvedValue(fakeCreditScore as never);
    mockCreateLoan.mockResolvedValue(fakeLoan as never);

    const req = makeReq({
      body: { farmId: 'farm-1', type: 'input_finance', amountRequestedKes: 30000 },
    });
    const res = makeRes();

    await loanController.submitLoan(req as never, res, next);

    expect(mockFindCreditScore).toHaveBeenCalledWith('farmer-1');
    expect(mockCreateLoan).toHaveBeenCalledWith('farmer-1', 75, 'B', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeLoan });
  });

  it('throws 422 NO_CREDIT_SCORE when no credit score exists', async () => {
    mockFindCreditScore.mockResolvedValue(null);

    const req = makeReq({ body: { amountRequestedKes: 10000 } });
    const res = makeRes();

    await loanController.submitLoan(req as never, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422, errorCode: 'NO_CREDIT_SCORE' }),
    );
    expect(mockCreateLoan).not.toHaveBeenCalled();
  });

  it('throws 422 EXCEEDS_CREDIT_LIMIT when requested amount exceeds limit', async () => {
    mockFindCreditScore.mockResolvedValue(fakeCreditScore as never);

    const req = makeReq({ body: { amountRequestedKes: 100000 } });
    const res = makeRes();

    await loanController.submitLoan(req as never, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422, errorCode: 'EXCEEDS_CREDIT_LIMIT' }),
    );
    expect(mockCreateLoan).not.toHaveBeenCalled();
  });

  it('forwards unexpected errors to next', async () => {
    const err = new Error('DB connection lost');
    mockFindCreditScore.mockRejectedValue(err);

    const req = makeReq({ body: { amountRequestedKes: 10000 } });
    const res = makeRes();

    await loanController.submitLoan(req as never, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('loanController.listLoans', () => {
  it('returns loans for the authenticated farmer', async () => {
    mockFindLoansByFarmer.mockResolvedValue([fakeLoan] as never);

    const req = makeReq();
    const res = makeRes();

    await loanController.listLoans(req as never, res, next);

    expect(mockFindLoansByFarmer).toHaveBeenCalledWith('farmer-1');
    expect(res.json).toHaveBeenCalledWith({ data: [fakeLoan] });
  });

  it('forwards errors to next', async () => {
    mockFindLoansByFarmer.mockRejectedValue(new Error('DB error'));

    await loanController.listLoans(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('loanController.getLoan', () => {
  it('returns the loan when it belongs to the farmer', async () => {
    mockFindLoanById.mockResolvedValue(fakeLoan as never);

    const req = makeReq({ params: { loanId: 'loan-1' } });
    const res = makeRes();

    await loanController.getLoan(req as never, res, next);

    expect(mockFindLoanById).toHaveBeenCalledWith('loan-1');
    expect(res.json).toHaveBeenCalledWith({ data: fakeLoan });
  });

  it('throws 404 LOAN_NOT_FOUND when loan not found', async () => {
    mockFindLoanById.mockResolvedValue(null);

    const req = makeReq({ params: { loanId: 'ghost' } });
    const res = makeRes();

    await loanController.getLoan(req as never, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, errorCode: 'LOAN_NOT_FOUND' }),
    );
  });

  it('throws 404 when loan belongs to a different farmer', async () => {
    mockFindLoanById.mockResolvedValue({ ...fakeLoan, farmerId: 'other-farmer' } as never);

    const req = makeReq({ params: { loanId: 'loan-1' } });
    const res = makeRes();

    await loanController.getLoan(req as never, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, errorCode: 'LOAN_NOT_FOUND' }),
    );
  });
});
