const mockLicenseApp = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
};
const mockSubsidyProgram = {
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
};
const mockSubsidyApplication = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
};
const mockRegistration = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockDocument = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

jest.mock('@agroconnect/db/govt', () => ({
  prisma: {
    licenseApplication: mockLicenseApp,
    subsidyProgram: mockSubsidyProgram,
    subsidyApplication: mockSubsidyApplication,
    farmRegistration: mockRegistration,
    govtDocument: mockDocument,
  },
}));

import * as licenseRepo from '../../../src/repositories/licenseRepository';
import * as subsidyRepo from '../../../src/repositories/subsidyRepository';
import * as registrationRepo from '../../../src/repositories/registrationRepository';
import * as documentRepo from '../../../src/repositories/documentRepository';
import type { CreateRegistrationDto } from '../../../src/schemas/createRegistration.schema';
import type { UpdateRegistrationStatusDto } from '../../../src/schemas/updateRegistrationStatus.schema';

beforeEach(() => jest.clearAllMocks());

// ─── licenseRepository ───────────────────────────────────────────────────────

describe('licenseRepository.createLicense', () => {
  it('calls prisma.licenseApplication.create with correct data', async () => {
    mockLicenseApp.create.mockResolvedValue({ id: 'lic-1' });
    const dto = { farmId: 'farm-1', licenseType: 'pesticide_use' as const };
    await licenseRepo.createLicense('farmer-1', dto);
    expect(mockLicenseApp.create).toHaveBeenCalledWith({
      data: { farmerId: 'farmer-1', farmId: 'farm-1', licenseType: 'pesticide_use', description: undefined },
    });
  });
});

describe('licenseRepository.findLicensesByFarmer', () => {
  it('queries with farmerId and pagination', async () => {
    mockLicenseApp.findMany.mockResolvedValue([]);
    await licenseRepo.findLicensesByFarmer('farmer-1', { take: 20, skip: 0 });
    expect(mockLicenseApp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { farmerId: 'farmer-1' }, take: 20, skip: 0 }),
    );
  });
});

describe('licenseRepository.countLicensesByFarmer', () => {
  it('counts with farmerId filter', async () => {
    mockLicenseApp.count.mockResolvedValue(3);
    const result = await licenseRepo.countLicensesByFarmer('farmer-1');
    expect(result).toBe(3);
    expect(mockLicenseApp.count).toHaveBeenCalledWith({ where: { farmerId: 'farmer-1' } });
  });
});

describe('licenseRepository.findLicenseById', () => {
  it('looks up by id', async () => {
    mockLicenseApp.findUnique.mockResolvedValue({ id: 'lic-1' });
    const result = await licenseRepo.findLicenseById('lic-1');
    expect(result?.id).toBe('lic-1');
    expect(mockLicenseApp.findUnique).toHaveBeenCalledWith({ where: { id: 'lic-1' } });
  });
});

// ─── subsidyRepository ───────────────────────────────────────────────────────

describe('subsidyRepository.findAllActivePrograms', () => {
  it('queries active programs with pagination', async () => {
    mockSubsidyProgram.findMany.mockResolvedValue([]);
    await subsidyRepo.findAllActivePrograms({ take: 20, skip: 0 });
    expect(mockSubsidyProgram.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true }, take: 20, skip: 0 }),
    );
  });
});

describe('subsidyRepository.countActivePrograms', () => {
  it('counts active programs', async () => {
    mockSubsidyProgram.count.mockResolvedValue(5);
    const result = await subsidyRepo.countActivePrograms();
    expect(result).toBe(5);
  });
});

describe('subsidyRepository.findProgramById', () => {
  it('looks up program by id', async () => {
    mockSubsidyProgram.findUnique.mockResolvedValue({ id: 'prog-1' });
    const result = await subsidyRepo.findProgramById('prog-1');
    expect(result?.id).toBe('prog-1');
  });
});

describe('subsidyRepository.createApplication', () => {
  it('creates application record', async () => {
    mockSubsidyApplication.create.mockResolvedValue({ id: 'app-1' });
    const dto = { farmId: 'farm-1', notes: 'Need help' };
    await subsidyRepo.createApplication('farmer-1', 'prog-1', dto);
    expect(mockSubsidyApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { farmerId: 'farmer-1', programId: 'prog-1', farmId: 'farm-1', notes: 'Need help' },
      }),
    );
  });
});

describe('subsidyRepository.findApplicationsByFarmer', () => {
  it('queries farmer applications with pagination', async () => {
    mockSubsidyApplication.findMany.mockResolvedValue([]);
    await subsidyRepo.findApplicationsByFarmer('farmer-1', { take: 10, skip: 0 });
    expect(mockSubsidyApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { farmerId: 'farmer-1' }, take: 10, skip: 0 }),
    );
  });
});

describe('subsidyRepository.countApplicationsByFarmer', () => {
  it('counts farmer applications', async () => {
    mockSubsidyApplication.count.mockResolvedValue(2);
    const result = await subsidyRepo.countApplicationsByFarmer('farmer-1');
    expect(result).toBe(2);
  });
});

describe('subsidyRepository.findExistingApplication', () => {
  it('looks up by composite key', async () => {
    mockSubsidyApplication.findUnique.mockResolvedValue({ id: 'app-1' });
    const result = await subsidyRepo.findExistingApplication('farmer-1', 'prog-1');
    expect(result?.id).toBe('app-1');
    expect(mockSubsidyApplication.findUnique).toHaveBeenCalledWith({
      where: { farmerId_programId: { farmerId: 'farmer-1', programId: 'prog-1' } },
    });
  });
});

// ─── registrationRepository ──────────────────────────────────────────────────

describe('registrationRepository.createRegistration', () => {
  it('creates registration record with submitted status', async () => {
    mockRegistration.create.mockResolvedValue({ id: 'reg-1' });
    const dto: CreateRegistrationDto = {
      farmId: 'farm-1',
      farmName: 'Wanjiru Farm',
      county: 'Meru',
      areaAcres: 5.5,
    };
    await registrationRepo.createRegistration('farmer-1', dto, 'GOV-REF-001');
    expect(mockRegistration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ farmerId: 'farmer-1', registrationRef: 'GOV-REF-001', status: 'submitted' }),
    });
  });
});

describe('registrationRepository.findRegistrationsByFarmer', () => {
  it('queries by farmer with pagination', async () => {
    mockRegistration.findMany.mockResolvedValue([]);
    await registrationRepo.findRegistrationsByFarmer('farmer-1', { take: 20, skip: 0 });
    expect(mockRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { farmerId: 'farmer-1' }, take: 20, skip: 0 }),
    );
  });
});

describe('registrationRepository.countRegistrationsByFarmer', () => {
  it('counts farmer registrations', async () => {
    mockRegistration.count.mockResolvedValue(1);
    const result = await registrationRepo.countRegistrationsByFarmer('farmer-1');
    expect(result).toBe(1);
  });
});

describe('registrationRepository.findRegistrationById', () => {
  it('looks up by id with documents included', async () => {
    mockRegistration.findUnique.mockResolvedValue({ id: 'reg-1', documents: [] });
    const result = await registrationRepo.findRegistrationById('reg-1');
    expect(result?.id).toBe('reg-1');
    expect(mockRegistration.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reg-1' }, include: { documents: true } }),
    );
  });
});

describe('registrationRepository.updateRegistrationStatus', () => {
  it('updates status and officer', async () => {
    mockRegistration.update.mockResolvedValue({ id: 'reg-1', status: 'approved' });
    const dto: UpdateRegistrationStatusDto = { status: 'approved', notes: 'All good' };
    await registrationRepo.updateRegistrationStatus('reg-1', 'officer-1', dto);
    expect(mockRegistration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: { status: 'approved', notes: 'All good', officerId: 'officer-1' },
    });
  });
});

// ─── documentRepository ─────────────────────────────────────────────────────

describe('documentRepository.createDocument', () => {
  it('creates document record', async () => {
    mockDocument.create.mockResolvedValue({ id: 'doc-1' });
    const data = { userId: 'user-1', documentType: 'national_id' as const, fileName: 'id.pdf', mediaUrl: 'https://s3/id.pdf' };
    await documentRepo.createDocument(data);
    expect(mockDocument.create).toHaveBeenCalledWith({ data });
  });
});

describe('documentRepository.findDocumentsByUser', () => {
  it('queries documents by user with pagination', async () => {
    mockDocument.findMany.mockResolvedValue([]);
    await documentRepo.findDocumentsByUser('user-1', { take: 20, skip: 0 });
    expect(mockDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, take: 20, skip: 0 }),
    );
  });
});

describe('documentRepository.countDocumentsByUser', () => {
  it('counts user documents', async () => {
    mockDocument.count.mockResolvedValue(4);
    const result = await documentRepo.countDocumentsByUser('user-1');
    expect(result).toBe(4);
  });
});
