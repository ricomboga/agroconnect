import * as farmRepo from '../../../src/repositories/farmRepository';
import * as harvestRepo from '../../../src/repositories/harvestRepository';
import * as harvestService from '../../../src/services/harvestService';

jest.mock('../../../src/repositories/farmRepository', () => ({ findFarmById: jest.fn() }));
jest.mock('../../../src/repositories/harvestRepository', () => ({
  createHarvest: jest.fn(),
  findHarvestsByFarm: jest.fn(),
  countHarvestsByFarm: jest.fn(),
}));
jest.mock('../../../src/events/producers/harvestRecordedProducer', () => ({
  publishHarvestRecorded: jest.fn(),
}));

import { publishHarvestRecorded } from '../../../src/events/producers/harvestRecordedProducer';

const mockFindFarmById = jest.mocked(farmRepo.findFarmById);
const mockCreateHarvest = jest.mocked(harvestRepo.createHarvest);
const mockFindHarvestsByFarm = jest.mocked(harvestRepo.findHarvestsByFarm);
const mockCountHarvestsByFarm = jest.mocked(harvestRepo.countHarvestsByFarm);
const mockPublishHarvestRecorded = jest.mocked(publishHarvestRecorded);

const fakeFarm = { id: 'farm-001', ownerId: 'owner-001', county: 'Kirinyaga', status: 'active', plots: [] };

const fakeHarvest = {
  id: 'harvest-001',
  farmId: 'farm-001',
  plotId: null,
  crop: 'maize',
  variety: null,
  quantityKg: '800.00',
  qualityGrade: 'A' as const,
  harvestDate: new Date('2025-07-20'),
  storageLocation: null,
  soldQuantityKg: '0',
  avgPriceKes: null,
  totalRevenueKes: null,
  notes: null,
};

const createDto = {
  crop: 'maize',
  quantityKg: 800,
  harvestDate: '2025-07-20',
  soldQuantityKg: 0,
};

beforeEach(() => jest.clearAllMocks());

describe('harvestService.recordHarvest', () => {
  it('creates a harvest and publishes farm.harvest.recorded', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreateHarvest.mockResolvedValue(fakeHarvest as never);
    mockPublishHarvestRecorded.mockResolvedValue();

    const result = await harvestService.recordHarvest('farm-001', 'owner-001', 'farmer', createDto);

    expect(result.id).toBe('harvest-001');
    expect(mockPublishHarvestRecorded).toHaveBeenCalledTimes(1);
    expect(mockPublishHarvestRecorded).toHaveBeenCalledWith(
      'harvest-001',
      'farm-001',
      'owner-001',
      'maize',
      800,
    );
  });

  it('throws 404 FARM_NOT_FOUND when farm does not exist', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      harvestService.recordHarvest('ghost-farm', 'owner-001', 'farmer', createDto),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });

    expect(mockCreateHarvest).not.toHaveBeenCalled();
    expect(mockPublishHarvestRecorded).not.toHaveBeenCalled();
  });

  it('does not publish event when harvest creation fails', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreateHarvest.mockRejectedValue(new Error('DB error'));

    await expect(
      harvestService.recordHarvest('farm-001', 'owner-001', 'farmer', createDto),
    ).rejects.toThrow('DB error');

    expect(mockPublishHarvestRecorded).not.toHaveBeenCalled();
  });
});

describe('harvestService.listHarvests', () => {
  it('returns harvests and total', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindHarvestsByFarm.mockResolvedValue([fakeHarvest] as never);
    mockCountHarvestsByFarm.mockResolvedValue(1);

    const result = await harvestService.listHarvests('farm-001', 'owner-001', 'farmer', { take: 20, skip: 0 });

    expect(result.harvests).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindHarvestsByFarm).toHaveBeenCalledTimes(1);
    expect(mockCountHarvestsByFarm).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when farm does not belong to owner', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      harvestService.listHarvests('farm-001', 'other-owner', 'farmer', { take: 20, skip: 0 }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });
  });
});
