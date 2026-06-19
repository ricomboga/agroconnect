import * as licenseRepo from '../../../src/repositories/licenseRepository';
import * as licenseService from '../../../src/services/licenseService';

jest.mock('../../../src/repositories/licenseRepository', () => ({
  createLicense: jest.fn(),
  findLicensesByFarmer: jest.fn(),
  countLicensesByFarmer: jest.fn(),
  findLicenseById: jest.fn(),
}));

const mockCreateLicense = jest.mocked(licenseRepo.createLicense);
const mockFindLicensesByFarmer = jest.mocked(licenseRepo.findLicensesByFarmer);
const mockCountLicensesByFarmer = jest.mocked(licenseRepo.countLicensesByFarmer);
const mockFindLicenseById = jest.mocked(licenseRepo.findLicenseById);

const fakeLicense = {
  id: 'license-1',
  farmerId: 'farmer-1',
  licenseType: 'pesticide_use',
  status: 'pending',
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('licenseService.applyForLicense', () => {
  it('creates and returns a license', async () => {
    mockCreateLicense.mockResolvedValue(fakeLicense as never);

    const dto = { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', licenseType: 'pesticide_use' as const, description: 'For pesticide application' };
    const result = await licenseService.applyForLicense('farmer-1', dto);

    expect(mockCreateLicense).toHaveBeenCalledWith('farmer-1', dto);
    expect(result.id).toBe('license-1');
  });
});

describe('licenseService.listLicenses', () => {
  it('returns licenses and total', async () => {
    mockFindLicensesByFarmer.mockResolvedValue([fakeLicense] as never);
    mockCountLicensesByFarmer.mockResolvedValue(1);

    const result = await licenseService.listLicenses('farmer-1', { take: 20, skip: 0 });

    expect(result.licenses).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindLicensesByFarmer).toHaveBeenCalledWith('farmer-1', { take: 20, skip: 0 });
  });
});

describe('licenseService.getLicense', () => {
  it('returns license when farmer owns it', async () => {
    mockFindLicenseById.mockResolvedValue(fakeLicense as never);

    const result = await licenseService.getLicense('license-1', 'farmer-1', 'farmer');

    expect(result.id).toBe('license-1');
  });

  it('returns license for admin regardless of ownership', async () => {
    mockFindLicenseById.mockResolvedValue({ ...fakeLicense, farmerId: 'other-farmer' } as never);

    const result = await licenseService.getLicense('license-1', 'admin-id', 'admin');

    expect(result.id).toBe('license-1');
  });

  it('returns license for govt_officer regardless of ownership', async () => {
    mockFindLicenseById.mockResolvedValue({ ...fakeLicense, farmerId: 'other-farmer' } as never);

    const result = await licenseService.getLicense('license-1', 'officer-id', 'govt_officer');

    expect(result.id).toBe('license-1');
  });

  it('throws 404 when license not found', async () => {
    mockFindLicenseById.mockResolvedValue(null);

    await expect(
      licenseService.getLicense('ghost', 'farmer-1', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'LICENSE_NOT_FOUND' });
  });

  it('throws 404 when farmer tries to access another farmer license', async () => {
    mockFindLicenseById.mockResolvedValue({ ...fakeLicense, farmerId: 'other-farmer' } as never);

    await expect(
      licenseService.getLicense('license-1', 'farmer-1', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'LICENSE_NOT_FOUND' });
  });
});
