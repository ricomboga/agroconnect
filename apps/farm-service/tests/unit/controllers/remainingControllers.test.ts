import { Request, Response, NextFunction } from 'express';
import * as inputService from '../../../src/services/inputService';
import * as reportService from '../../../src/services/reportService';
import * as summaryService from '../../../src/services/summaryService';
import * as adminStatsRepo from '../../../src/repositories/adminStatsRepository';
import * as inputController from '../../../src/controllers/inputController';
import * as reportController from '../../../src/controllers/reportController';
import * as summaryController from '../../../src/controllers/summaryController';
import * as internalStatsController from '../../../src/controllers/internalStatsController';

jest.mock('../../../src/services/inputService', () => ({
  recordInput: jest.fn(),
  listInputs: jest.fn(),
  updateInput: jest.fn(),
  deleteInput: jest.fn(),
}));

jest.mock('../../../src/services/reportService', () => ({
  generateReport: jest.fn(),
}));

jest.mock('../../../src/services/summaryService', () => ({
  getFarmSummary: jest.fn(),
}));

jest.mock('../../../src/repositories/adminStatsRepository', () => ({
  countActiveFarms: jest.fn(),
  countDiagnosesThisMonth: jest.fn(),
}));

const mockRecordInput = jest.mocked(inputService.recordInput);
const mockListInputs = jest.mocked(inputService.listInputs);
const mockUpdateInput = jest.mocked(inputService.updateInput);
const mockDeleteInput = jest.mocked(inputService.deleteInput);
const mockGenerateReport = jest.mocked(reportService.generateReport);
const mockGetFarmSummary = jest.mocked(summaryService.getFarmSummary);
const mockCountActiveFarms = jest.mocked(adminStatsRepo.countActiveFarms);
const mockCountDiagnosesThisMonth = jest.mocked(adminStatsRepo.countDiagnosesThisMonth);

function makeAuthReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'owner-1', role: 'farmer', phone: '+254700000001' },
    params: { farmId: 'farm-1' },
    query: {},
    body: {},
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

// ─── inputController ────────────────────────────────────────────────────────

describe('inputController.recordInput', () => {
  it('records input and responds 201', async () => {
    const fakeInput = { id: 'inp-1', farmId: 'farm-1', type: 'fertilizer', quantityKg: 50 };
    mockRecordInput.mockResolvedValue(fakeInput as never);

    const req = makeAuthReq({ body: { type: 'fertilizer', quantityKg: 50 } });
    const res = makeRes();

    await inputController.recordInput(req as never, res, next);

    expect(mockRecordInput).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeInput });
  });

  it('forwards errors to next', async () => {
    mockRecordInput.mockRejectedValue(new Error('Failed'));

    await inputController.recordInput(makeAuthReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('inputController.listInputs', () => {
  it('returns inputs with pagination meta', async () => {
    const fakeInputs = [{ id: 'inp-1', type: 'fertilizer' }];
    mockListInputs.mockResolvedValue({ inputs: fakeInputs, total: 1 } as never);

    const req = makeAuthReq({ params: { farmId: 'farm-1' }, query: { page: 1 } });
    const res = makeRes();

    await inputController.listInputs(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: fakeInputs,
      meta: expect.objectContaining({ total: 1, page_size: 20 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListInputs.mockRejectedValue(new Error('Error'));

    await inputController.listInputs(makeAuthReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('inputController.updateInput', () => {
  it('updates input and responds with the updated record', async () => {
    const fakeInput = { id: 'inp-1', productName: 'DAP' };
    mockUpdateInput.mockResolvedValue(fakeInput as never);

    const req = makeAuthReq({
      params: { farmId: 'farm-1', inputId: 'inp-1' },
      body: { productName: 'DAP' },
    });
    const res = makeRes();

    await inputController.updateInput(req as never, res, next);

    expect(mockUpdateInput).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', 'inp-1', req.body);
    expect(res.json).toHaveBeenCalledWith({ data: fakeInput });
  });

  it('forwards errors to next', async () => {
    mockUpdateInput.mockRejectedValue(new Error('Failed'));

    await inputController.updateInput(
      makeAuthReq({ params: { farmId: 'farm-1', inputId: 'inp-1' } }) as never,
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('inputController.deleteInput', () => {
  it('deletes input and responds 204', async () => {
    mockDeleteInput.mockResolvedValue(undefined);

    const req = makeAuthReq({ params: { farmId: 'farm-1', inputId: 'inp-1' } });
    const res = makeRes();

    await inputController.deleteInput(req as never, res, next);

    expect(mockDeleteInput).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', 'inp-1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('forwards errors to next', async () => {
    mockDeleteInput.mockRejectedValue(new Error('Failed'));

    await inputController.deleteInput(
      makeAuthReq({ params: { farmId: 'farm-1', inputId: 'inp-1' } }) as never,
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── reportController ────────────────────────────────────────────────────────

describe('reportController.generateReport', () => {
  it('responds 200 with url when report is ready immediately', async () => {
    mockGenerateReport.mockResolvedValue({ url: 'https://media.example.com/r.pdf' });

    const req = makeAuthReq({ params: { farmId: 'farm-1' } });
    const res = makeRes();

    await reportController.generateReport(req as never, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { url: 'https://media.example.com/r.pdf' } });
  });

  it('responds 202 when report is queued as async job', async () => {
    mockGenerateReport.mockResolvedValue({ jobId: 'job-abc' });

    const req = makeAuthReq({ params: { farmId: 'farm-1' } });
    const res = makeRes();

    await reportController.generateReport(req as never, res, next);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ data: { jobId: 'job-abc' } });
  });

  it('forwards errors to next', async () => {
    mockGenerateReport.mockRejectedValue(new Error('Report failed'));

    await reportController.generateReport(makeAuthReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── summaryController ────────────────────────────────────────────────────────

describe('summaryController.getFarmSummary', () => {
  it('returns the farm summary', async () => {
    const fakeSummary = { totalActivities: 10, totalHarvests: 5, totalInputs: 8 };
    mockGetFarmSummary.mockResolvedValue(fakeSummary as never);

    const req = makeAuthReq({
      params: { farmId: 'farm-1' },
      query: { from_date: '2026-01-01', to_date: '2026-06-30' },
    });
    const res = makeRes();

    await summaryController.getFarmSummary(req as never, res, next);

    expect(mockGetFarmSummary).toHaveBeenCalledWith(
      'farm-1', 'owner-1', 'farmer', '2026-01-01', '2026-06-30',
    );
    expect(res.json).toHaveBeenCalledWith({ data: fakeSummary });
  });

  it('forwards errors to next', async () => {
    mockGetFarmSummary.mockRejectedValue(new Error('Summary failed'));

    await summaryController.getFarmSummary(makeAuthReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── internalStatsController ──────────────────────────────────────────────────

describe('internalStatsController.getStatsHandler', () => {
  it('returns aggregated stats', async () => {
    mockCountActiveFarms.mockResolvedValue(42);
    mockCountDiagnosesThisMonth.mockResolvedValue(7);

    const res = makeRes();

    await internalStatsController.getStatsHandler({} as Request, res, next);

    expect(res.json).toHaveBeenCalledWith({ total_farms: 42, diagnoses_this_month: 7 });
  });

  it('forwards errors to next', async () => {
    mockCountActiveFarms.mockRejectedValue(new Error('Stats failed'));

    await internalStatsController.getStatsHandler({} as Request, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
