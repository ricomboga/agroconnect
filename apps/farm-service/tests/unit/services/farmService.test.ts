import * as farmRepo from '../../../src/repositories/farmRepository';
import * as farmService from '../../../src/services/farmService';

jest.mock('../../../src/repositories/farmRepository', () => ({
  createFarm: jest.fn(),
  findFarmsByOwner: jest.fn(),
  countFarmsByOwner: jest.fn(),
  findFarmById: jest.fn(),
  updateFarm: jest.fn(),
  softDeleteFarm: jest.fn(),
}));

jest.mock('../../../src/events/producers/farmCreatedProducer', () => ({
  publishFarmCreated: jest.fn(),
}));

import { publishFarmCreated } from '../../../src/events/producers/farmCreatedProducer';

const mockCreateFarm = jest.mocked(farmRepo.createFarm);
const mockFindFarmsByOwner = jest.mocked(farmRepo.findFarmsByOwner);
const mockCountFarmsByOwner = jest.mocked(farmRepo.countFarmsByOwner);
const mockFindFarmById = jest.mocked(farmRepo.findFarmById);
const mockUpdateFarm = jest.mocked(farmRepo.updateFarm);
const mockSoftDeleteFarm = jest.mocked(farmRepo.softDeleteFarm);
const mockPublishFarmCreated = jest.mocked(publishFarmCreated);

const fakeFarm = {
  id: 'farm-uuid-001',
  ownerId: 'owner-uuid-001',
  name: 'Wanjiru Farm',
  county: 'Meru',
  subCounty: null,
  locationLat: '-0.02',
  locationLng: '37.90',
  areaAcres: '5.50',
  soilType: null,
  waterSource: null,
  status: 'active' as const,
  plots: [],
  activities: [],
  inputs: [],
  harvests: [],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const createDto = {
  name: 'Wanjiru Farm',
  locationLat: -0.02,
  locationLng: 37.9,
  county: 'Meru',
  areaAcres: 5.5,
};

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// createFarm
// ---------------------------------------------------------------------------
describe('farmService.createFarm', () => {
  it('creates a farm and publishes farm.created event', async () => {
    mockCreateFarm.mockResolvedValue(fakeFarm as never);
    mockPublishFarmCreated.mockResolvedValue();

    const result = await farmService.createFarm('owner-uuid-001', createDto);

    expect(mockCreateFarm).toHaveBeenCalledTimes(1);
    expect(mockPublishFarmCreated).toHaveBeenCalledTimes(1);
    expect(mockPublishFarmCreated).toHaveBeenCalledWith('farm-uuid-001', 'owner-uuid-001', 'Meru');
    expect(result.id).toBe('farm-uuid-001');
  });

  it('does not suppress Kafka errors (they propagate)', async () => {
    mockCreateFarm.mockResolvedValue(fakeFarm as never);
    mockPublishFarmCreated.mockRejectedValue(new Error('Kafka unavailable'));

    await expect(farmService.createFarm('owner-uuid-001', createDto)).rejects.toThrow(
      'Kafka unavailable',
    );
  });
});

// ---------------------------------------------------------------------------
// listFarms
// ---------------------------------------------------------------------------
describe('farmService.listFarms', () => {
  it('returns farms and total for a farmer (scoped to their ownerId)', async () => {
    mockFindFarmsByOwner.mockResolvedValue([fakeFarm] as never);
    mockCountFarmsByOwner.mockResolvedValue(1);

    const result = await farmService.listFarms('owner-uuid-001', 'farmer', { take: 20, skip: 0 });

    expect(result.farms).toHaveLength(1);
    expect(result.total).toBe(1);
    // Farmer path: ownerId passed to repo
    expect(mockFindFarmsByOwner).toHaveBeenCalledWith('owner-uuid-001', { take: 20, skip: 0 });
  });

  it('passes undefined ownerId for admin (sees all farms)', async () => {
    mockFindFarmsByOwner.mockResolvedValue([fakeFarm, fakeFarm] as never);
    mockCountFarmsByOwner.mockResolvedValue(2);

    await farmService.listFarms('admin-uuid', 'admin', { take: 20, skip: 0 });

    expect(mockFindFarmsByOwner).toHaveBeenCalledWith(undefined, { take: 20, skip: 0 });
    expect(mockCountFarmsByOwner).toHaveBeenCalledWith(undefined);
  });

  it('runs findMany and count in parallel (both called once)', async () => {
    mockFindFarmsByOwner.mockResolvedValue([]);
    mockCountFarmsByOwner.mockResolvedValue(0);

    await farmService.listFarms('owner-uuid-001', 'farmer', { take: 20, skip: 0 });

    expect(mockFindFarmsByOwner).toHaveBeenCalledTimes(1);
    expect(mockCountFarmsByOwner).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// getFarm
// ---------------------------------------------------------------------------
describe('farmService.getFarm', () => {
  it('returns the farm when found', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);

    const result = await farmService.getFarm('farm-uuid-001', 'owner-uuid-001', 'farmer');

    expect(result.id).toBe('farm-uuid-001');
  });

  it('throws 404 FARM_NOT_FOUND when farm does not exist', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      farmService.getFarm('nonexistent', 'owner-uuid-001', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });
  });

  it('uses undefined ownerId for admin (can access any farm)', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);

    await farmService.getFarm('farm-uuid-001', 'admin-uuid', 'admin');

    expect(mockFindFarmById).toHaveBeenCalledWith('farm-uuid-001', undefined);
  });
});

// ---------------------------------------------------------------------------
// updateFarm
// ---------------------------------------------------------------------------
describe('farmService.updateFarm', () => {
  it('updates and returns the refreshed farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockUpdateFarm.mockResolvedValue({ count: 1 } as never);

    await farmService.updateFarm('farm-uuid-001', 'owner-uuid-001', 'farmer', { name: 'New Name' });

    expect(mockUpdateFarm).toHaveBeenCalledTimes(1);
    // findFarmById called twice: once for ownership check, once for return value
    expect(mockFindFarmById).toHaveBeenCalledTimes(2);
  });

  it('throws 404 FARM_NOT_FOUND when ownership check fails', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      farmService.updateFarm('ghost-farm', 'owner-uuid-001', 'farmer', { name: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });

    expect(mockUpdateFarm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteFarm
// ---------------------------------------------------------------------------
describe('farmService.deleteFarm', () => {
  it('soft-deletes the farm (does not call a hard delete)', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockSoftDeleteFarm.mockResolvedValue({ count: 1 } as never);

    await farmService.deleteFarm('farm-uuid-001', 'owner-uuid-001', 'farmer');

    expect(mockSoftDeleteFarm).toHaveBeenCalledTimes(1);
  });

  it('throws 404 FARM_NOT_FOUND when the farm does not belong to the user', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      farmService.deleteFarm('ghost-farm', 'owner-uuid-001', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });

    expect(mockSoftDeleteFarm).not.toHaveBeenCalled();
  });
});
