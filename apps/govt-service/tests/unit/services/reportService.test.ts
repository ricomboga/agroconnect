import * as reportRepo from '../../../src/repositories/reportRepository';
import * as reportService from '../../../src/services/reportService';

jest.mock('../../../src/repositories/reportRepository', () => ({
  countRegisteredFarms: jest.fn(),
  countPendingRegistrations: jest.fn(),
  countSubsidiesIssued: jest.fn(),
  countPendingSubsidyApplications: jest.fn(),
  countPendingLicenseApplications: jest.fn(),
}));

const mockCountRegisteredFarms = jest.mocked(reportRepo.countRegisteredFarms);
const mockCountPendingRegistrations = jest.mocked(reportRepo.countPendingRegistrations);
const mockCountSubsidiesIssued = jest.mocked(reportRepo.countSubsidiesIssued);
const mockCountPendingSubsidyApplications = jest.mocked(reportRepo.countPendingSubsidyApplications);
const mockCountPendingLicenseApplications = jest.mocked(reportRepo.countPendingLicenseApplications);

beforeEach(() => jest.clearAllMocks());

describe('reportService.getCountySummary', () => {
  it('aggregates counts scoped to the given county', async () => {
    mockCountRegisteredFarms.mockResolvedValue(12);
    mockCountPendingRegistrations.mockResolvedValue(3);
    mockCountSubsidiesIssued.mockResolvedValue(5);
    mockCountPendingSubsidyApplications.mockResolvedValue(2);
    mockCountPendingLicenseApplications.mockResolvedValue(1);

    const result = await reportService.getCountySummary('Meru');

    expect(mockCountRegisteredFarms).toHaveBeenCalledWith('Meru');
    expect(mockCountPendingRegistrations).toHaveBeenCalledWith('Meru');
    expect(mockCountSubsidiesIssued).toHaveBeenCalledWith('Meru');
    expect(mockCountPendingSubsidyApplications).toHaveBeenCalledWith('Meru');
    expect(result).toEqual({
      county: 'Meru',
      registered_farms: 12,
      subsidies_issued: 5,
      pending_registrations: 3,
      pending_subsidy_applications: 2,
      pending_license_applications: 1,
      total_pending_review: 6,
    });
  });

  it('returns county: null and county-wide aggregates when no county filter is given', async () => {
    mockCountRegisteredFarms.mockResolvedValue(100);
    mockCountPendingRegistrations.mockResolvedValue(10);
    mockCountSubsidiesIssued.mockResolvedValue(20);
    mockCountPendingSubsidyApplications.mockResolvedValue(4);
    mockCountPendingLicenseApplications.mockResolvedValue(2);

    const result = await reportService.getCountySummary();

    expect(mockCountRegisteredFarms).toHaveBeenCalledWith(undefined);
    expect(result.county).toBeNull();
    expect(result.total_pending_review).toBe(16);
  });
});
