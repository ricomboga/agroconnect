import * as authClient from '../../src/clients/authServiceClient';
import * as farmClient from '../../src/clients/farmServiceClient';
import * as financeClient from '../../src/clients/financeServiceClient';
import * as marketClient from '../../src/clients/marketServiceClient';
import * as analyticsService from '../../src/services/analyticsService';

jest.mock('../../src/clients/authServiceClient', () => ({
  listUsers: jest.fn(),
  setUserStatus: jest.fn(),
  verifyUser: jest.fn(),
  getStats: jest.fn(),
}));

jest.mock('../../src/clients/farmServiceClient', () => ({
  getStats: jest.fn(),
}));

jest.mock('../../src/clients/financeServiceClient', () => ({
  getStats: jest.fn(),
}));

jest.mock('../../src/clients/marketServiceClient', () => ({
  getStats: jest.fn(),
}));

const mockAuthStats = jest.mocked(authClient.getStats);
const mockFarmStats = jest.mocked(farmClient.getStats);
const mockFinanceStats = jest.mocked(financeClient.getStats);
const mockMarketStats = jest.mocked(marketClient.getStats);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('analyticsService.getSummary', () => {
  it('aggregates stats from all services', async () => {
    mockAuthStats.mockResolvedValue({ total_farmers: 120 });
    mockFarmStats.mockResolvedValue({ total_farms: 85, diagnoses_this_month: 12 });
    mockFinanceStats.mockResolvedValue({ loans_disbursed_kes: 500000 });
    mockMarketStats.mockResolvedValue({ active_listings: 34 });

    const result = await analyticsService.getSummary();

    expect(result).toEqual({
      total_farmers: 120,
      total_farms: 85,
      diagnoses_this_month: 12,
      loans_disbursed_kes: 500000,
      active_listings: 34,
    });
  });

  it('returns zeros for a failing service and succeeds overall', async () => {
    mockAuthStats.mockRejectedValue(new Error('auth-service down'));
    mockFarmStats.mockResolvedValue({ total_farms: 85, diagnoses_this_month: 5 });
    mockFinanceStats.mockResolvedValue({ loans_disbursed_kes: 250000 });
    mockMarketStats.mockResolvedValue({ active_listings: 20 });

    const result = await analyticsService.getSummary();

    expect(result.total_farmers).toBe(0);
    expect(result.total_farms).toBe(85);
    expect(result.loans_disbursed_kes).toBe(250000);
    expect(result.active_listings).toBe(20);
  });

  it('returns all zeros when every service is down', async () => {
    mockAuthStats.mockRejectedValue(new Error('down'));
    mockFarmStats.mockRejectedValue(new Error('down'));
    mockFinanceStats.mockRejectedValue(new Error('down'));
    mockMarketStats.mockRejectedValue(new Error('down'));

    const result = await analyticsService.getSummary();

    expect(result).toEqual({
      total_farmers: 0,
      total_farms: 0,
      diagnoses_this_month: 0,
      loans_disbursed_kes: 0,
      active_listings: 0,
    });
  });
});
