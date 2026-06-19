import { Response, NextFunction } from 'express';
import * as activityService from '../../../src/services/activityService';
import * as activityController from '../../../src/controllers/activityController';

jest.mock('../../../src/services/activityService', () => ({
  scheduleActivity: jest.fn(),
  listActivities: jest.fn(),
  updateActivity: jest.fn(),
}));

const mockScheduleActivity = jest.mocked(activityService.scheduleActivity);
const mockListActivities = jest.mocked(activityService.listActivities);
const mockUpdateActivity = jest.mocked(activityService.updateActivity);

const fakeActivity = { id: 'act-1', farmId: 'farm-1', type: 'planting', status: 'scheduled' };

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
  };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

describe('activityController.scheduleActivity', () => {
  it('schedules activity and responds 201', async () => {
    mockScheduleActivity.mockResolvedValue(fakeActivity as never);

    const req = makeReq({ body: { type: 'planting', scheduledDate: '2026-06-20' } });
    const res = makeRes();

    await activityController.scheduleActivity(req as never, res, next);

    expect(mockScheduleActivity).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeActivity });
  });

  it('forwards errors to next', async () => {
    mockScheduleActivity.mockRejectedValue(new Error('Scheduling failed'));

    await activityController.scheduleActivity(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('activityController.listActivities', () => {
  it('returns activities with pagination meta', async () => {
    mockListActivities.mockResolvedValue({ activities: [fakeActivity], total: 1 } as never);

    const req = makeReq({ params: { farmId: 'farm-1' }, query: { page: 1 } });
    const res = makeRes();

    await activityController.listActivities(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: [fakeActivity],
      meta: expect.objectContaining({ total: 1, page_size: 20 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListActivities.mockRejectedValue(new Error('List error'));

    await activityController.listActivities(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('activityController.updateActivity', () => {
  it('updates and returns the activity', async () => {
    mockUpdateActivity.mockResolvedValue({ ...fakeActivity, status: 'completed' } as never);

    const req = makeReq({
      params: { farmId: 'farm-1', activityId: 'act-1' },
      body: { status: 'completed' },
    });
    const res = makeRes();

    await activityController.updateActivity(req as never, res, next);

    expect(mockUpdateActivity).toHaveBeenCalledWith('farm-1', 'owner-1', 'farmer', 'act-1', { status: 'completed' });
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'completed' }) });
  });

  it('forwards errors to next', async () => {
    mockUpdateActivity.mockRejectedValue(new Error('Update failed'));

    await activityController.updateActivity(makeReq() as never, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
