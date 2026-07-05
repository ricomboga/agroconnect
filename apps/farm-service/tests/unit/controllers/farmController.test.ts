import { Response, NextFunction } from 'express';
import * as farmService from '../../../src/services/farmService';
import * as farmController from '../../../src/controllers/farmController';

jest.mock('../../../src/services/farmService', () => ({
  createFarm: jest.fn(),
  listFarms: jest.fn(),
  getFarm: jest.fn(),
  updateFarm: jest.fn(),
  deleteFarm: jest.fn(),
}));

const mockCreateFarm = jest.mocked(farmService.createFarm);
const mockListFarms = jest.mocked(farmService.listFarms);
const mockGetFarm = jest.mocked(farmService.getFarm);
const mockUpdateFarm = jest.mocked(farmService.updateFarm);
const mockDeleteFarm = jest.mocked(farmService.deleteFarm);

const fakeFarm = { id: 'farm-1', name: 'Wanjiru Farm', ownerId: 'owner-1', county: 'Meru' };

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'owner-1', role: 'farmer', phone: '+254700000001' },
    params: {},
    query: {},
    body: {},
    headers: {},
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

describe('farmController.createFarm', () => {
  it('creates a farm and responds 201', async () => {
    mockCreateFarm.mockResolvedValue(fakeFarm as never);

    const req = makeReq({ body: { name: 'Wanjiru Farm', county: 'Meru' } });
    const res = makeRes();

    await farmController.createFarm(req as never, res, next);

    expect(mockCreateFarm).toHaveBeenCalledWith('owner-1', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeFarm });
  });

  it('forwards errors to next', async () => {
    const err = new Error('DB error');
    mockCreateFarm.mockRejectedValue(err);

    await farmController.createFarm(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('farmController.listFarms', () => {
  it('returns farms with pagination meta', async () => {
    mockListFarms.mockResolvedValue({ farms: [fakeFarm], total: 1 } as never);

    const req = makeReq({ query: { page: '1', page_size: '20' } });
    const res = makeRes();

    await farmController.listFarms(req as never, res, next);

    expect(mockListFarms).toHaveBeenCalledWith('owner-1', 'farmer', { take: 20, skip: 0 }, { search: undefined, county: undefined });
    expect(res.json).toHaveBeenCalledWith({
      data: [fakeFarm],
      meta: { total: 1, page: 1, page_size: 20 },
    });
  });

  it('forwards errors to next', async () => {
    mockListFarms.mockRejectedValue(new Error('Service error'));

    await farmController.listFarms(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('farmController.getFarm', () => {
  it('returns a farm by ID', async () => {
    mockGetFarm.mockResolvedValue(fakeFarm as never);

    const req = makeReq({ params: { farmId: 'farm-1' } });
    const res = makeRes();

    await farmController.getFarm(req as never, res, next);

    expect(mockGetFarm).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer');
    expect(res.json).toHaveBeenCalledWith({ data: fakeFarm });
  });

  it('forwards 404 errors to next', async () => {
    const err = Object.assign(new Error('Not found'), { statusCode: 404 });
    mockGetFarm.mockRejectedValue(err);

    await farmController.getFarm(makeReq({ params: { farmId: 'ghost' } }) as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('farmController.updateFarm', () => {
  it('updates and returns the farm', async () => {
    mockUpdateFarm.mockResolvedValue({ ...fakeFarm, name: 'New Name' } as never);

    const req = makeReq({ params: { farmId: 'farm-1' }, body: { name: 'New Name' } });
    const res = makeRes();

    await farmController.updateFarm(req as never, res, next);

    expect(mockUpdateFarm).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', { name: 'New Name' });
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'New Name' }) });
  });

  it('forwards errors to next', async () => {
    mockUpdateFarm.mockRejectedValue(new Error('Update failed'));

    await farmController.updateFarm(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('farmController.deleteFarm', () => {
  it('soft deletes and responds 204', async () => {
    mockDeleteFarm.mockResolvedValue();

    const req = makeReq({ params: { farmId: 'farm-1' } });
    const res = makeRes();

    await farmController.deleteFarm(req as never, res, next);

    expect(mockDeleteFarm).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('forwards errors to next', async () => {
    mockDeleteFarm.mockRejectedValue(new Error('Delete failed'));

    await farmController.deleteFarm(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
