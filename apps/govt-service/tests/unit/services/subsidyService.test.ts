import * as subsidyRepo from '../../../src/repositories/subsidyRepository';
import * as subsidyService from '../../../src/services/subsidyService';

jest.mock('../../../src/repositories/subsidyRepository', () => ({
  findAllActivePrograms: jest.fn(),
  countActivePrograms: jest.fn(),
  findProgramById: jest.fn(),
  findExistingApplication: jest.fn(),
  createApplication: jest.fn(),
  findApplicationsByFarmer: jest.fn(),
  countApplicationsByFarmer: jest.fn(),
}));

const mockFindAllActivePrograms = jest.mocked(subsidyRepo.findAllActivePrograms);
const mockCountActivePrograms = jest.mocked(subsidyRepo.countActivePrograms);
const mockFindProgramById = jest.mocked(subsidyRepo.findProgramById);
const mockFindExistingApplication = jest.mocked(subsidyRepo.findExistingApplication);
const mockCreateApplication = jest.mocked(subsidyRepo.createApplication);
const mockFindApplicationsByFarmer = jest.mocked(subsidyRepo.findApplicationsByFarmer);
const mockCountApplicationsByFarmer = jest.mocked(subsidyRepo.countApplicationsByFarmer);

const fakeProgram = { id: 'prog-1', name: 'Fertilizer Subsidy 2026', isActive: true, maxAmountKes: 5000 };
const fakeApplication = { id: 'app-1', farmerId: 'farmer-1', programId: 'prog-1', status: 'pending' };

beforeEach(() => jest.clearAllMocks());

describe('subsidyService.listPrograms', () => {
  it('returns active programs and total', async () => {
    mockFindAllActivePrograms.mockResolvedValue([fakeProgram] as never);
    mockCountActivePrograms.mockResolvedValue(1);

    const result = await subsidyService.listPrograms({ take: 20, skip: 0 });

    expect(result.programs).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindAllActivePrograms).toHaveBeenCalledWith({ take: 20, skip: 0 });
  });
});

describe('subsidyService.applyForSubsidy', () => {
  it('creates application when program is active and no duplicate', async () => {
    mockFindProgramById.mockResolvedValue(fakeProgram as never);
    mockFindExistingApplication.mockResolvedValue(null);
    mockCreateApplication.mockResolvedValue(fakeApplication as never);

    const dto = { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', notes: 'Need help with seeds' };
    const result = await subsidyService.applyForSubsidy('farmer-1', 'prog-1', dto);

    expect(mockCreateApplication).toHaveBeenCalledWith('farmer-1', 'prog-1', dto);
    expect(result.id).toBe('app-1');
  });

  it('throws 404 when program not found', async () => {
    mockFindProgramById.mockResolvedValue(null);
    const dto = { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };

    await expect(
      subsidyService.applyForSubsidy('farmer-1', 'ghost-prog', dto),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'PROGRAM_NOT_FOUND' });
  });

  it('throws 404 when program is not active', async () => {
    mockFindProgramById.mockResolvedValue({ ...fakeProgram, isActive: false } as never);
    const dto = { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };

    await expect(
      subsidyService.applyForSubsidy('farmer-1', 'prog-1', dto),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'PROGRAM_NOT_FOUND' });
  });

  it('throws 409 DUPLICATE_APPLICATION when already applied', async () => {
    mockFindProgramById.mockResolvedValue(fakeProgram as never);
    mockFindExistingApplication.mockResolvedValue(fakeApplication as never);
    const dto = { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };

    await expect(
      subsidyService.applyForSubsidy('farmer-1', 'prog-1', dto),
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'DUPLICATE_APPLICATION' });

    expect(mockCreateApplication).not.toHaveBeenCalled();
  });
});

describe('subsidyService.listApplications', () => {
  it('returns applications and total for a farmer', async () => {
    mockFindApplicationsByFarmer.mockResolvedValue([fakeApplication] as never);
    mockCountApplicationsByFarmer.mockResolvedValue(1);

    const result = await subsidyService.listApplications('farmer-1', { take: 20, skip: 0 });

    expect(result.applications).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindApplicationsByFarmer).toHaveBeenCalledWith('farmer-1', { take: 20, skip: 0 });
  });
});
