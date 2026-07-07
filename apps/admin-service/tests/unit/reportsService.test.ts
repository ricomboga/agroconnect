import * as farmClient from '../../src/clients/farmServiceClient';
import * as financeClient from '../../src/clients/financeServiceClient';
import * as reportsService from '../../src/services/reportsService';

jest.mock('../../src/clients/farmServiceClient', () => ({
  getFarmersByCounty: jest.fn(),
  getLivestockStats: jest.fn(),
}));

jest.mock('../../src/clients/financeServiceClient', () => ({
  getLoansByInstitution: jest.fn(),
}));

const mockGetFarmersByCounty = jest.mocked(farmClient.getFarmersByCounty);
const mockGetLivestockStats = jest.mocked(farmClient.getLivestockStats);
const mockGetLoansByInstitution = jest.mocked(financeClient.getLoansByInstitution);

beforeEach(() => jest.clearAllMocks());

describe('reportsService.getFarmersByCounty', () => {
  it('passes through the farm-service result', async () => {
    mockGetFarmersByCounty.mockResolvedValue([{ county: 'Kitui', farmerCount: 42 }]);

    const result = await reportsService.getFarmersByCounty();

    expect(result).toEqual([{ county: 'Kitui', farmerCount: 42 }]);
  });
});

describe('reportsService.getLivestockStats', () => {
  it('forwards filters to the farm-service client', async () => {
    mockGetLivestockStats.mockResolvedValue([]);

    await reportsService.getLivestockStats({ county: 'Kitui', animalType: 'pig' });

    expect(mockGetLivestockStats).toHaveBeenCalledWith({ county: 'Kitui', animalType: 'pig' });
  });
});

describe('reportsService.getLoansByInstitution', () => {
  it('passes through the finance-service result', async () => {
    mockGetLoansByInstitution.mockResolvedValue([
      { institutionId: 'p1', institutionName: 'Equity Bank', totalDisbursedKes: 1000 },
    ]);

    const result = await reportsService.getLoansByInstitution();

    expect(result).toEqual([{ institutionId: 'p1', institutionName: 'Equity Bank', totalDisbursedKes: 1000 }]);
  });
});

describe('reportsService.exportReportCsv', () => {
  it('serializes farmers-by-county rows to CSV with a header row', async () => {
    mockGetFarmersByCounty.mockResolvedValue([
      { county: 'Kitui', farmerCount: 42 },
      { county: 'Nairobi', farmerCount: 10 },
    ]);

    const csv = await reportsService.exportReportCsv('farmers-by-county', {});

    expect(csv).toBe('county,farmerCount\nKitui,42\nNairobi,10');
  });

  it('returns an empty string for a report with no rows', async () => {
    mockGetLoansByInstitution.mockResolvedValue([]);

    const csv = await reportsService.exportReportCsv('loans-by-institution', {});

    expect(csv).toBe('');
  });

  it('escapes values containing commas or quotes', async () => {
    mockGetLoansByInstitution.mockResolvedValue([
      { institutionId: 'p1', institutionName: 'Equity, "Bank"', totalDisbursedKes: 1000 },
    ]);

    const csv = await reportsService.exportReportCsv('loans-by-institution', {});

    expect(csv).toContain('"Equity, ""Bank"""');
  });
});
