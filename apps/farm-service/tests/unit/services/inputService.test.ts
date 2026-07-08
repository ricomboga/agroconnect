import * as farmRepo from '../../../src/repositories/farmRepository';
import * as inputRepo from '../../../src/repositories/inputRepository';
import * as inputService from '../../../src/services/inputService';

jest.mock('../../../src/repositories/farmRepository', () => ({ findFarmById: jest.fn() }));
jest.mock('../../../src/repositories/inputRepository', () => ({
  createInput: jest.fn(),
  findInputsByFarm: jest.fn(),
  countInputsByFarm: jest.fn(),
  findInputById: jest.fn(),
  updateInput: jest.fn(),
  deleteInput: jest.fn(),
}));

const mockFindFarmById = jest.mocked(farmRepo.findFarmById);
const mockCreateInput = jest.mocked(inputRepo.createInput);
const mockFindInputsByFarm = jest.mocked(inputRepo.findInputsByFarm);
const mockCountInputsByFarm = jest.mocked(inputRepo.countInputsByFarm);
const mockFindInputById = jest.mocked(inputRepo.findInputById);
const mockUpdateInput = jest.mocked(inputRepo.updateInput);
const mockDeleteInput = jest.mocked(inputRepo.deleteInput);

const fakeFarm = { id: 'farm-001', ownerId: 'owner-001', county: 'Meru', status: 'active', plots: [] };

const createDto = {
  type: 'fertiliser' as const,
  productName: 'CAN 26N',
  quantity: 50,
  unit: 'kg',
  unitCostKes: 60,
  totalCostKes: 3000,
  appliedDate: '2025-03-05',
};

beforeEach(() => jest.clearAllMocks());

describe('inputService.recordInput', () => {
  it('creates an input when farm ownership is confirmed', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockCreateInput.mockResolvedValue({ id: 'input-001', ...createDto } as never);

    const result = await inputService.recordInput('farm-001', 'owner-001', 'farmer', createDto);

    expect(result).toMatchObject({ id: 'input-001' });
    expect(mockCreateInput).toHaveBeenCalledTimes(1);
  });

  it('throws 404 FARM_NOT_FOUND when farm is not found', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      inputService.recordInput('ghost-farm', 'owner-001', 'farmer', createDto),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });
  });
});

describe('inputService.listInputs — season coercion', () => {
  beforeEach(() => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindInputsByFarm.mockResolvedValue([]);
    mockCountInputsByFarm.mockResolvedValue(0);
  });

  it('translates season year into a Jan 1 – Dec 31 date range', async () => {
    await inputService.listInputs('farm-001', 'owner-001', 'farmer', { season: 2025 }, { take: 20, skip: 0 });

    const callArg = mockFindInputsByFarm.mock.calls[0][1] as {
      appliedDateRange?: { gte: Date; lte: Date };
    };
    expect(callArg.appliedDateRange?.gte).toEqual(new Date('2025-01-01'));
    expect(callArg.appliedDateRange?.lte).toEqual(new Date('2025-12-31'));
  });

  it('omits appliedDateRange when season is not provided', async () => {
    await inputService.listInputs('farm-001', 'owner-001', 'farmer', {}, { take: 20, skip: 0 });

    const callArg = mockFindInputsByFarm.mock.calls[0][1] as {
      appliedDateRange?: unknown;
    };
    expect(callArg.appliedDateRange).toBeUndefined();
  });

  it('forwards the type filter to the repository', async () => {
    await inputService.listInputs('farm-001', 'owner-001', 'farmer', { type: 'seed' }, { take: 20, skip: 0 });

    const callArg = mockFindInputsByFarm.mock.calls[0][1] as { type?: string };
    expect(callArg.type).toBe('seed');
  });

  it('runs findMany and count in parallel (each called once)', async () => {
    await inputService.listInputs('farm-001', 'owner-001', 'farmer', {}, { take: 20, skip: 0 });

    expect(mockFindInputsByFarm).toHaveBeenCalledTimes(1);
    expect(mockCountInputsByFarm).toHaveBeenCalledTimes(1);
  });
});

describe('inputService.updateInput', () => {
  it('updates and returns the input when it exists on the farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindInputById
      .mockResolvedValueOnce({ id: 'input-001', ...createDto } as never)
      .mockResolvedValueOnce({ id: 'input-001', ...createDto, productName: 'DAP' } as never);
    mockUpdateInput.mockResolvedValue({ count: 1 } as never);

    const result = await inputService.updateInput('farm-001', 'owner-001', 'farmer', 'input-001', {
      productName: 'DAP',
    });

    expect(result?.productName).toBe('DAP');
    expect(mockUpdateInput).toHaveBeenCalledTimes(1);
  });

  it('throws 404 INPUT_NOT_FOUND when the input does not exist on the farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindInputById.mockResolvedValue(null);

    await expect(
      inputService.updateInput('farm-001', 'owner-001', 'farmer', 'ghost-input', { productName: 'DAP' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'INPUT_NOT_FOUND' });

    expect(mockUpdateInput).not.toHaveBeenCalled();
  });

  it('throws 404 FARM_NOT_FOUND when farm does not belong to owner', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      inputService.updateInput('farm-001', 'other-owner', 'farmer', 'input-001', { productName: 'DAP' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });
  });
});

describe('inputService.deleteInput', () => {
  it('deletes the input when it exists on the farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindInputById.mockResolvedValue({ id: 'input-001', ...createDto } as never);
    mockDeleteInput.mockResolvedValue({ count: 1 } as never);

    await inputService.deleteInput('farm-001', 'owner-001', 'farmer', 'input-001');

    expect(mockDeleteInput).toHaveBeenCalledWith('input-001', 'farm-001');
  });

  it('throws 404 INPUT_NOT_FOUND when the input does not exist on the farm', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    mockFindInputById.mockResolvedValue(null);

    await expect(
      inputService.deleteInput('farm-001', 'owner-001', 'farmer', 'ghost-input'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'INPUT_NOT_FOUND' });

    expect(mockDeleteInput).not.toHaveBeenCalled();
  });
});
