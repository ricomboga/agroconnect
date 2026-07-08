import { Response, NextFunction } from 'express';
import * as harvestService from '../../../src/services/harvestService';
import * as harvestController from '../../../src/controllers/harvestController';

jest.mock('../../../src/services/harvestService', () => ({
  recordHarvest: jest.fn(),
  listHarvests: jest.fn(),
  updateHarvest: jest.fn(),
  deleteHarvest: jest.fn(),
}));

const mockRecordHarvest = jest.mocked(harvestService.recordHarvest);
const mockListHarvests = jest.mocked(harvestService.listHarvests);
const mockUpdateHarvest = jest.mocked(harvestService.updateHarvest);
const mockDeleteHarvest = jest.mocked(harvestService.deleteHarvest);

const fakeHarvest = { id: 'harvest-1', farmId: 'farm-1', crop: 'maize', quantityKg: 500 };

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

describe('harvestController.recordHarvest', () => {
  it('records harvest and responds 201', async () => {
    mockRecordHarvest.mockResolvedValue(fakeHarvest as never);

    const req = makeReq({ body: { crop: 'maize', quantityKg: 500 } });
    const res = makeRes();

    await harvestController.recordHarvest(req as never, res, next);

    expect(mockRecordHarvest).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeHarvest });
  });

  it('forwards errors to next', async () => {
    mockRecordHarvest.mockRejectedValue(new Error('Failed'));

    await harvestController.recordHarvest(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('harvestController.listHarvests', () => {
  it('returns harvests with pagination meta', async () => {
    mockListHarvests.mockResolvedValue({ harvests: [fakeHarvest], total: 1 } as never);

    const req = makeReq({ params: { farmId: 'farm-1' }, query: {} });
    const res = makeRes();

    await harvestController.listHarvests(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: [fakeHarvest],
      meta: { total: 1, page: 1, page_size: 20 },
    });
  });

  it('forwards errors to next', async () => {
    mockListHarvests.mockRejectedValue(new Error('DB error'));

    await harvestController.listHarvests(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('harvestController.updateHarvest', () => {
  it('updates harvest and responds with the updated record', async () => {
    mockUpdateHarvest.mockResolvedValue({ ...fakeHarvest, crop: 'beans' } as never);

    const req = makeReq({ params: { farmId: 'farm-1', harvestId: 'harvest-1' }, body: { crop: 'beans' } });
    const res = makeRes();

    await harvestController.updateHarvest(req as never, res, next);

    expect(mockUpdateHarvest).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', 'harvest-1', req.body);
    expect(res.json).toHaveBeenCalledWith({ data: { ...fakeHarvest, crop: 'beans' } });
  });

  it('forwards errors to next', async () => {
    mockUpdateHarvest.mockRejectedValue(new Error('Failed'));

    await harvestController.updateHarvest(
      makeReq({ params: { farmId: 'farm-1', harvestId: 'harvest-1' } }) as never,
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('harvestController.deleteHarvest', () => {
  it('deletes harvest and responds 204', async () => {
    mockDeleteHarvest.mockResolvedValue(undefined);

    const req = makeReq({ params: { farmId: 'farm-1', harvestId: 'harvest-1' } });
    const res = makeRes();

    await harvestController.deleteHarvest(req as never, res, next);

    expect(mockDeleteHarvest).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', 'harvest-1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('forwards errors to next', async () => {
    mockDeleteHarvest.mockRejectedValue(new Error('Failed'));

    await harvestController.deleteHarvest(
      makeReq({ params: { farmId: 'farm-1', harvestId: 'harvest-1' } }) as never,
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
