import * as registrationRepo from '../../../src/repositories/registrationRepository';
import * as ecitizenClient from '../../../src/clients/ecitizenClient';
import * as registrationService from '../../../src/services/registrationService';

jest.mock('../../../src/repositories/registrationRepository', () => ({
  createRegistration: jest.fn(),
  findRegistrationsByFarmer: jest.fn(),
  countRegistrationsByFarmer: jest.fn(),
  findAllRegistrations: jest.fn(),
  countAllRegistrations: jest.fn(),
  findRegistrationById: jest.fn(),
  findRegistrationByFarmId: jest.fn(),
  updateRegistrationStatus: jest.fn(),
}));

jest.mock('../../../src/clients/ecitizenClient', () => ({
  submitFarmRegistration: jest.fn(),
}));

jest.mock('../../../src/events/producers/registrationSubmittedProducer', () => ({
  publishRegistrationSubmitted: jest.fn(),
}));

import { publishRegistrationSubmitted } from '../../../src/events/producers/registrationSubmittedProducer';

const mockCreateRegistration = jest.mocked(registrationRepo.createRegistration);
const mockFindRegistrationsByFarmer = jest.mocked(registrationRepo.findRegistrationsByFarmer);
const mockCountRegistrationsByFarmer = jest.mocked(registrationRepo.countRegistrationsByFarmer);
const mockFindAllRegistrations = jest.mocked(registrationRepo.findAllRegistrations);
const mockCountAllRegistrations = jest.mocked(registrationRepo.countAllRegistrations);
const mockFindRegistrationById = jest.mocked(registrationRepo.findRegistrationById);
const mockUpdateRegistrationStatus = jest.mocked(registrationRepo.updateRegistrationStatus);
const mockSubmitFarmRegistration = jest.mocked(ecitizenClient.submitFarmRegistration);
const mockPublishRegistrationSubmitted = jest.mocked(publishRegistrationSubmitted);

const fakeRegistration = {
  id: 'reg-1',
  farmerId: 'farmer-1',
  farmName: 'Wanjiru Farm',
  county: 'Meru',
  areaAcres: '5.50',
  registrationRef: 'GOV-REF-001',
  status: 'pending',
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('registrationService.submitRegistration', () => {
  it('submits registration and publishes event', async () => {
    mockSubmitFarmRegistration.mockResolvedValue({ registrationRef: 'GOV-REF-001', status: 'submitted' });
    mockCreateRegistration.mockResolvedValue(fakeRegistration as never);
    mockPublishRegistrationSubmitted.mockResolvedValue();

    const dto = { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', farmName: 'Wanjiru Farm', county: 'Meru' as const, areaAcres: 5.5 };
    const result = await registrationService.submitRegistration('farmer-1', dto);

    expect(mockSubmitFarmRegistration).toHaveBeenCalledWith({
      farmerId: 'farmer-1',
      farmName: 'Wanjiru Farm',
      county: 'Meru',
      areaAcres: 5.5,
    });
    expect(mockCreateRegistration).toHaveBeenCalledWith('farmer-1', dto, 'GOV-REF-001');
    expect(mockPublishRegistrationSubmitted).toHaveBeenCalledWith('reg-1', 'farmer-1', 'Meru');
    expect(result.id).toBe('reg-1');
  });
});

describe('registrationService.listRegistrations', () => {
  it('scopes to the caller farmerId when role is farmer', async () => {
    mockFindRegistrationsByFarmer.mockResolvedValue([fakeRegistration] as never);
    mockCountRegistrationsByFarmer.mockResolvedValue(1);

    const result = await registrationService.listRegistrations(
      'farmer-1',
      'farmer',
      { take: 20, skip: 0 },
      { county: 'Meru' as const, status: 'approved' },
    );

    expect(result.registrations).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindRegistrationsByFarmer).toHaveBeenCalledWith('farmer-1', { take: 20, skip: 0 });
    expect(mockFindAllRegistrations).not.toHaveBeenCalled();
  });

  it('lists across all farmers filtered by county/status when role is govt_officer', async () => {
    mockFindAllRegistrations.mockResolvedValue([fakeRegistration] as never);
    mockCountAllRegistrations.mockResolvedValue(1);

    const filters = { county: 'Meru' as const, status: 'submitted' as const };
    const result = await registrationService.listRegistrations(
      'officer-1',
      'govt_officer',
      { take: 20, skip: 0 },
      filters,
    );

    expect(result.registrations).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindAllRegistrations).toHaveBeenCalledWith(filters, { take: 20, skip: 0 });
    expect(mockCountAllRegistrations).toHaveBeenCalledWith(filters);
    expect(mockFindRegistrationsByFarmer).not.toHaveBeenCalled();
  });

  it('lists across all farmers when role is admin', async () => {
    mockFindAllRegistrations.mockResolvedValue([]);
    mockCountAllRegistrations.mockResolvedValue(0);

    await registrationService.listRegistrations('admin-1', 'admin', { take: 20, skip: 0 }, {});

    expect(mockFindAllRegistrations).toHaveBeenCalledWith({}, { take: 20, skip: 0 });
    expect(mockFindRegistrationsByFarmer).not.toHaveBeenCalled();
  });
});

describe('registrationService.getRegistration', () => {
  it('returns the registration when found', async () => {
    mockFindRegistrationById.mockResolvedValue(fakeRegistration as never);

    const result = await registrationService.getRegistration('reg-1');

    expect(result.id).toBe('reg-1');
  });

  it('throws 404 REGISTRATION_NOT_FOUND when missing', async () => {
    mockFindRegistrationById.mockResolvedValue(null);

    await expect(registrationService.getRegistration('ghost')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'REGISTRATION_NOT_FOUND',
    });
  });
});

describe('registrationService.updateStatus', () => {
  it('updates status after verifying registration exists', async () => {
    mockFindRegistrationById.mockResolvedValue(fakeRegistration as never);
    mockUpdateRegistrationStatus.mockResolvedValue({ ...fakeRegistration, status: 'approved' } as never);

    const dto = { status: 'approved' as const, officerNotes: 'Looks good' };
    await registrationService.updateStatus('reg-1', 'officer-1', dto);

    expect(mockUpdateRegistrationStatus).toHaveBeenCalledWith('reg-1', 'officer-1', dto);
  });

  it('throws 404 when registration not found', async () => {
    mockFindRegistrationById.mockResolvedValue(null);

    await expect(
      registrationService.updateStatus('ghost', 'officer-1', { status: 'approved' as const }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
