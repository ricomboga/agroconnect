import * as subsidyRepo from '../../../src/repositories/subsidyRepository';
import * as registrationRepo from '../../../src/repositories/registrationRepository';
import * as subsidyService from '../../../src/services/subsidyService';

jest.mock('../../../src/repositories/subsidyRepository', () => ({
  findAllActivePrograms: jest.fn(),
  countActivePrograms: jest.fn(),
  findProgramById: jest.fn(),
  findExistingApplication: jest.fn(),
  createApplication: jest.fn(),
  findApplicationsByFarmer: jest.fn(),
  countApplicationsByFarmer: jest.fn(),
  findAllApplications: jest.fn(),
  countAllApplications: jest.fn(),
  findApplicationById: jest.fn(),
  updateApplicationStatus: jest.fn(),
  nextCertSequence: jest.fn(),
  createProgram: jest.fn(),
}));

jest.mock('../../../src/repositories/registrationRepository', () => ({
  findRegistrationByFarmId: jest.fn(),
}));

const mockFindAllActivePrograms = jest.mocked(subsidyRepo.findAllActivePrograms);
const mockCountActivePrograms = jest.mocked(subsidyRepo.countActivePrograms);
const mockFindProgramById = jest.mocked(subsidyRepo.findProgramById);
const mockFindExistingApplication = jest.mocked(subsidyRepo.findExistingApplication);
const mockCreateApplication = jest.mocked(subsidyRepo.createApplication);
const mockFindApplicationsByFarmer = jest.mocked(subsidyRepo.findApplicationsByFarmer);
const mockCountApplicationsByFarmer = jest.mocked(subsidyRepo.countApplicationsByFarmer);
const mockFindAllApplications = jest.mocked(subsidyRepo.findAllApplications);
const mockCountAllApplications = jest.mocked(subsidyRepo.countAllApplications);
const mockFindApplicationById = jest.mocked(subsidyRepo.findApplicationById);
const mockUpdateApplicationStatus = jest.mocked(subsidyRepo.updateApplicationStatus);
const mockNextCertSequence = jest.mocked(subsidyRepo.nextCertSequence);
const mockCreateProgram = jest.mocked(subsidyRepo.createProgram);
const mockFindRegistrationByFarmId = jest.mocked(registrationRepo.findRegistrationByFarmId);

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

    const result = await subsidyService.listApplications('farmer-1', 'farmer', { take: 20, skip: 0 });

    expect(result.applications).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindApplicationsByFarmer).toHaveBeenCalledWith('farmer-1', { take: 20, skip: 0 });
    expect(mockFindAllApplications).not.toHaveBeenCalled();
  });

  it('returns the officer-wide queue for govt_officer/admin roles', async () => {
    mockFindAllApplications.mockResolvedValue([fakeApplication] as never);
    mockCountAllApplications.mockResolvedValue(1);

    const result = await subsidyService.listApplications(
      'officer-1',
      'govt_officer',
      { take: 20, skip: 0 },
      { county: 'Nakuru', status: 'submitted' },
    );

    expect(result.applications).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindAllApplications).toHaveBeenCalledWith(
      { county: 'Nakuru', status: 'submitted' },
      { take: 20, skip: 0 },
    );
    expect(mockFindApplicationsByFarmer).not.toHaveBeenCalled();
  });
});

describe('subsidyService.updateApplicationStatus', () => {
  const fakeApp = { id: 'app-1', farmId: 'farm-1', status: 'submitted' };

  it('throws 404 APPLICATION_NOT_FOUND when the application does not exist', async () => {
    mockFindApplicationById.mockResolvedValue(null);

    await expect(
      subsidyService.updateApplicationStatus('ghost', 'officer-1', { status: 'approved' } as never),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'APPLICATION_NOT_FOUND' });

    expect(mockUpdateApplicationStatus).not.toHaveBeenCalled();
  });

  it('generates a sequential KE/{county}/{year}/{n} cert number on approval', async () => {
    mockFindApplicationById.mockResolvedValue(fakeApp as never);
    mockFindRegistrationByFarmId.mockResolvedValue({ county: 'Meru' } as never);
    mockNextCertSequence.mockResolvedValue(5);
    mockUpdateApplicationStatus.mockResolvedValue({ ...fakeApp, status: 'approved' } as never);

    const dto = {
      status: 'approved' as const,
      approved_items: '2 bags fertiliser',
      collection_point: 'Meru DAO office',
      transport_provided: true,
      officer_notes: 'Verified',
    };
    await subsidyService.updateApplicationStatus('app-1', 'officer-1', dto);

    const year = new Date().getFullYear();
    expect(mockNextCertSequence).toHaveBeenCalledWith('Meru', year);
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(
      'app-1',
      'officer-1',
      expect.objectContaining({
        status: 'approved',
        approvedItems: '2 bags fertiliser',
        collectionPoint: 'Meru DAO office',
        transportProvided: true,
        officerNotes: 'Verified',
        certNumber: `KE/Meru/${year}/5`,
        county: 'Meru',
      }),
    );
  });

  it('falls back to county "NA" when the farm was never registered', async () => {
    mockFindApplicationById.mockResolvedValue(fakeApp as never);
    mockFindRegistrationByFarmId.mockResolvedValue(null);
    mockNextCertSequence.mockResolvedValue(1);
    mockUpdateApplicationStatus.mockResolvedValue({ ...fakeApp, status: 'approved' } as never);

    await subsidyService.updateApplicationStatus('app-1', 'officer-1', { status: 'approved' } as never);

    const year = new Date().getFullYear();
    expect(mockNextCertSequence).toHaveBeenCalledWith('NA', year);
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(
      'app-1',
      'officer-1',
      expect.objectContaining({ certNumber: `KE/NA/${year}/1`, county: 'NA' }),
    );
  });

  it('does not generate a cert number on rejection', async () => {
    mockFindApplicationById.mockResolvedValue(fakeApp as never);
    mockFindRegistrationByFarmId.mockResolvedValue({ county: 'Meru' } as never);
    mockUpdateApplicationStatus.mockResolvedValue({ ...fakeApp, status: 'rejected' } as never);

    await subsidyService.updateApplicationStatus('app-1', 'officer-1', {
      status: 'rejected',
      officer_notes: 'Not eligible',
    } as never);

    expect(mockNextCertSequence).not.toHaveBeenCalled();
    expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(
      'app-1',
      'officer-1',
      expect.objectContaining({ status: 'rejected', certNumber: undefined }),
    );
  });
});

describe('subsidyService.createProgram', () => {
  it('delegates to the repository', async () => {
    const dto = { name: 'Fertiliser Boost 2026' } as never;
    mockCreateProgram.mockResolvedValue({ id: 'prog-2' } as never);

    const result = await subsidyService.createProgram(dto);

    expect(mockCreateProgram).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('prog-2');
  });
});
