import * as plotRepo from '../../../src/repositories/plotRepository';
import * as farmRepo from '../../../src/repositories/farmRepository';
import * as plotService from '../../../src/services/plotService';

jest.mock('../../../src/repositories/plotRepository', () => ({
  createPlot: jest.fn(),
  findPlotsByFarm: jest.fn(),
  countPlotsByFarm: jest.fn(),
}));

jest.mock('../../../src/repositories/farmRepository', () => ({
  createFarm: jest.fn(),
  findFarmsByOwner: jest.fn(),
  countFarmsByOwner: jest.fn(),
  findFarmById: jest.fn(),
  updateFarm: jest.fn(),
  softDeleteFarm: jest.fn(),
}));

const mockCreatePlot = jest.mocked(plotRepo.createPlot);
const mockFindPlotsByFarm = jest.mocked(plotRepo.findPlotsByFarm);
const mockCountPlotsByFarm = jest.mocked(plotRepo.countPlotsByFarm);
const mockFindFarmById = jest.mocked(farmRepo.findFarmById);

const fakeFarm = { id: 'farm-1', ownerId: 'owner-1' };
const fakePlot = { id: 'plot-1', farmId: 'farm-1', name: 'Plot A', areaAcres: '1.50' };

const createDto = { name: 'Plot A', areaAcres: 1.5, soilType: null, cropType: null, notes: null };

beforeEach(() => jest.clearAllMocks());

describe('plotService.createPlot', () => {
  it('creates a plot when farm access is confirmed', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreatePlot.mockResolvedValue(fakePlot as never);

    const result = await plotService.createPlot('farm-1', 'owner-1', 'farmer', createDto);

    expect(mockFindFarmById).toHaveBeenCalledWith('farm-1', 'owner-1');
    expect(mockCreatePlot).toHaveBeenCalledWith('farm-1', createDto);
    expect(result).toBe(fakePlot);
  });

  it('passes undefined ownedBy for admin role', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreatePlot.mockResolvedValue(fakePlot as never);

    await plotService.createPlot('farm-1', 'admin-id', 'admin', createDto);

    expect(mockFindFarmById).toHaveBeenCalledWith('farm-1', undefined);
  });

  it('throws 404 FARM_NOT_FOUND when farm does not exist', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      plotService.createPlot('ghost-farm', 'owner-1', 'farmer', createDto),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });

    expect(mockCreatePlot).not.toHaveBeenCalled();
  });
});

describe('plotService.listPlots', () => {
  it('returns plots and total for the farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindPlotsByFarm.mockResolvedValue([fakePlot] as never);
    mockCountPlotsByFarm.mockResolvedValue(1);

    const result = await plotService.listPlots('farm-1', 'owner-1', 'farmer', { take: 20, skip: 0 });

    expect(result.plots).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindPlotsByFarm).toHaveBeenCalledWith('farm-1', { take: 20, skip: 0 });
    expect(mockCountPlotsByFarm).toHaveBeenCalledWith('farm-1');
  });

  it('runs findPlotsByFarm and countPlotsByFarm in parallel', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindPlotsByFarm.mockResolvedValue([]);
    mockCountPlotsByFarm.mockResolvedValue(0);

    await plotService.listPlots('farm-1', 'owner-1', 'farmer', { take: 20, skip: 0 });

    expect(mockFindPlotsByFarm).toHaveBeenCalledTimes(1);
    expect(mockCountPlotsByFarm).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when farm not found', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      plotService.listPlots('ghost', 'owner-1', 'farmer', { take: 20, skip: 0 }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });
  });

  it('passes undefined ownedBy for admin when listing plots', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindPlotsByFarm.mockResolvedValue([]);
    mockCountPlotsByFarm.mockResolvedValue(0);

    await plotService.listPlots('farm-1', 'admin-id', 'admin', { take: 20, skip: 0 });

    expect(mockFindFarmById).toHaveBeenCalledWith('farm-1', undefined);
  });
});
