import * as farmRepo from '../../../src/repositories/farmRepository';
import * as activityRepo from '../../../src/repositories/activityRepository';
import * as activityService from '../../../src/services/activityService';

jest.mock('../../../src/repositories/farmRepository', () => ({
  findFarmById: jest.fn(),
}));

jest.mock('../../../src/repositories/activityRepository', () => ({
  createActivity: jest.fn(),
  findActivitiesByFarm: jest.fn(),
  countActivitiesByFarm: jest.fn(),
  findActivityById: jest.fn(),
  updateActivity: jest.fn(),
}));

jest.mock('../../../src/events/producers/activityCompletedProducer', () => ({
  publishActivityCompleted: jest.fn(),
}));

import { publishActivityCompleted } from '../../../src/events/producers/activityCompletedProducer';

const mockFindFarmById = jest.mocked(farmRepo.findFarmById);
const mockCreateActivity = jest.mocked(activityRepo.createActivity);
const mockFindActivitiesByFarm = jest.mocked(activityRepo.findActivitiesByFarm);
const mockCountActivitiesByFarm = jest.mocked(activityRepo.countActivitiesByFarm);
const mockFindActivityById = jest.mocked(activityRepo.findActivityById);
const mockUpdateActivity = jest.mocked(activityRepo.updateActivity);
const mockPublishActivityCompleted = jest.mocked(publishActivityCompleted);

const fakeFarm = { id: 'farm-001', ownerId: 'owner-001', county: 'Meru', status: 'active', plots: [] };

const fakeActivity = {
  id: 'activity-001',
  farmId: 'farm-001',
  plotId: null,
  type: 'planting' as const,
  title: 'Season 1 planting',
  description: null,
  scheduledDate: new Date('2025-03-01'),
  completedDate: null,
  status: 'pending' as const,
  labourCostKes: 0,
  notes: null,
  createdAt: new Date(),
};

const createDto = {
  type: 'planting' as const,
  title: 'Season 1 planting',
  scheduledDate: '2025-03-01',
  labourCostKes: 0,
};

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// scheduleActivity
// ---------------------------------------------------------------------------
describe('activityService.scheduleActivity', () => {
  it('creates an activity when farm belongs to owner', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreateActivity.mockResolvedValue(fakeActivity as never);

    const result = await activityService.scheduleActivity('farm-001', 'owner-001', 'farmer', createDto);

    expect(result.id).toBe('activity-001');
    expect(mockCreateActivity).toHaveBeenCalledTimes(1);
  });

  it('throws 404 FARM_NOT_FOUND when farm does not exist', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      activityService.scheduleActivity('ghost-farm', 'owner-001', 'farmer', createDto),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });

    expect(mockCreateActivity).not.toHaveBeenCalled();
  });

  it('allows admin to create activity on any farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreateActivity.mockResolvedValue(fakeActivity as never);

    await activityService.scheduleActivity('farm-001', 'admin-uuid', 'admin', createDto);

    // Admin path: findFarmById called without ownerId
    expect(mockFindFarmById).toHaveBeenCalledWith('farm-001', undefined);
  });
});

// ---------------------------------------------------------------------------
// listActivities
// ---------------------------------------------------------------------------
describe('activityService.listActivities', () => {
  it('returns activities and total', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindActivitiesByFarm.mockResolvedValue([fakeActivity] as never);
    mockCountActivitiesByFarm.mockResolvedValue(1);

    const result = await activityService.listActivities(
      'farm-001', 'owner-001', 'farmer', {}, { take: 20, skip: 0 },
    );

    expect(result.activities).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('runs findMany and count in parallel — each called exactly once', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindActivitiesByFarm.mockResolvedValue([]);
    mockCountActivitiesByFarm.mockResolvedValue(0);

    await activityService.listActivities('farm-001', 'owner-001', 'farmer', {}, { take: 20, skip: 0 });

    expect(mockFindActivitiesByFarm).toHaveBeenCalledTimes(1);
    expect(mockCountActivitiesByFarm).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// updateActivity — Kafka publishing
// ---------------------------------------------------------------------------
describe('activityService.updateActivity', () => {
  it('does NOT publish a Kafka event when status is not completed', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindActivityById
      .mockResolvedValueOnce(fakeActivity as never)
      .mockResolvedValueOnce({ ...fakeActivity, status: 'skipped' } as never);
    mockUpdateActivity.mockResolvedValue({ count: 1 } as never);

    await activityService.updateActivity('farm-001', 'owner-001', 'farmer', 'activity-001', {
      status: 'skipped',
    });

    expect(mockPublishActivityCompleted).not.toHaveBeenCalled();
  });

  it('publishes farm.activity.completed ONLY when status transitions to completed', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindActivityById
      .mockResolvedValueOnce(fakeActivity as never)
      .mockResolvedValueOnce({ ...fakeActivity, status: 'completed' } as never);
    mockUpdateActivity.mockResolvedValue({ count: 1 } as never);
    mockPublishActivityCompleted.mockResolvedValue();

    await activityService.updateActivity('farm-001', 'owner-001', 'farmer', 'activity-001', {
      status: 'completed',
    });

    expect(mockPublishActivityCompleted).toHaveBeenCalledTimes(1);
    expect(mockPublishActivityCompleted).toHaveBeenCalledWith(
      'activity-001',
      'farm-001',
      'owner-001',
      'planting',
    );
  });

  it('throws 404 ACTIVITY_NOT_FOUND when activity does not exist on the farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindActivityById.mockResolvedValue(null);

    await expect(
      activityService.updateActivity('farm-001', 'owner-001', 'farmer', 'ghost-activity', {
        status: 'completed',
      }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'ACTIVITY_NOT_FOUND' });

    expect(mockUpdateActivity).not.toHaveBeenCalled();
    expect(mockPublishActivityCompleted).not.toHaveBeenCalled();
  });
});
