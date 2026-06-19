import { Response, NextFunction } from 'express';
import * as plotService from '../../../src/services/plotService';
import * as plotController from '../../../src/controllers/plotController';

jest.mock('../../../src/services/plotService', () => ({
  createPlot: jest.fn(),
  listPlots: jest.fn(),
}));

const mockCreatePlot = jest.mocked(plotService.createPlot);
const mockListPlots = jest.mocked(plotService.listPlots);

const fakePlot = { id: 'plot-1', farmId: 'farm-1', name: 'Plot A', areaAcres: '2.00' };

function makeReq(overrides: Record<string, unknown> = {}) {
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

describe('plotController.createPlot', () => {
  it('creates a plot and responds 201', async () => {
    mockCreatePlot.mockResolvedValue(fakePlot as never);

    const req = makeReq({ body: { name: 'Plot A', areaAcres: 2 } });
    const res = makeRes();

    await plotController.createPlot(req as never, res, next);

    expect(mockCreatePlot).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakePlot });
  });

  it('forwards errors to next', async () => {
    mockCreatePlot.mockRejectedValue(new Error('Failed'));

    await plotController.createPlot(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('plotController.listPlots', () => {
  it('returns plots with pagination meta', async () => {
    mockListPlots.mockResolvedValue({ plots: [fakePlot], total: 1 } as never);

    const req = makeReq({ params: { farmId: 'farm-1' }, query: { page: '1' } });
    const res = makeRes();

    await plotController.listPlots(req as never, res, next);

    expect(mockListPlots).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', { take: 20, skip: 0 });
    expect(res.json).toHaveBeenCalledWith({
      data: [fakePlot],
      meta: { total: 1, page: 1, page_size: 20 },
    });
  });

  it('forwards errors to next', async () => {
    mockListPlots.mockRejectedValue(new Error('Service error'));

    await plotController.listPlots(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
