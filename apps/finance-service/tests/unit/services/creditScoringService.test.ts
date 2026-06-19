import * as farmClient from '../../../src/clients/farmServiceClient';
import * as creditScoreRepo from '../../../src/repositories/creditScoreRepository';
import * as creditScoringService from '../../../src/services/creditScoringService';

jest.mock('../../../src/clients/farmServiceClient', () => ({
  getFarmerHarvests: jest.fn(),
  getFarmerInputs: jest.fn(),
  getFarmerActivities: jest.fn(),
}));

jest.mock('../../../src/repositories/creditScoreRepository', () => ({
  upsertCreditScore: jest.fn(),
  findCreditScore: jest.fn(),
}));

jest.mock('../../../src/scoring/computeScore', () => ({
  computeScoreFromData: jest.fn().mockReturnValue({
    score: 72,
    band: 'B',
    maxLoanKes: 50000,
    seasonsOfData: 3,
    avgYieldScore: 70,
    inputManagementScore: 75,
    activityComplianceScore: 68,
    platformEngagementScore: 80,
  }),
}));

const mockGetFarmerHarvests = jest.mocked(farmClient.getFarmerHarvests);
const mockGetFarmerInputs = jest.mocked(farmClient.getFarmerInputs);
const mockGetFarmerActivities = jest.mocked(farmClient.getFarmerActivities);
const mockUpsertCreditScore = jest.mocked(creditScoreRepo.upsertCreditScore);
const mockFindCreditScore = jest.mocked(creditScoreRepo.findCreditScore);

const fakeScoreRow = {
  farmerId: 'farmer-1',
  score: '72',
  band: 'B',
  maxLoanKes: '50000',
  seasonsOfData: 3,
  avgYieldScore: '70',
  inputManagementScore: '75',
  activityComplianceScore: '68',
  platformEngagementScore: '80',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('creditScoringService.computeScore', () => {
  it('fetches farm data, computes score, and upserts result', async () => {
    mockGetFarmerHarvests.mockResolvedValue([]);
    mockGetFarmerInputs.mockResolvedValue([]);
    mockGetFarmerActivities.mockResolvedValue([]);
    mockUpsertCreditScore.mockResolvedValue(fakeScoreRow as never);

    const result = await creditScoringService.computeScore('farmer-1', 'Bearer token-abc');

    expect(mockGetFarmerHarvests).toHaveBeenCalledWith('farmer-1', 'Bearer token-abc');
    expect(mockGetFarmerInputs).toHaveBeenCalledWith('farmer-1', 'Bearer token-abc');
    expect(mockGetFarmerActivities).toHaveBeenCalledWith('farmer-1', 'Bearer token-abc');
    expect(mockUpsertCreditScore).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(72);
    expect(result.band).toBe('B');
  });
});

describe('creditScoringService.getOrComputeScore', () => {
  it('returns existing score from DB without recomputing', async () => {
    mockFindCreditScore.mockResolvedValue(fakeScoreRow as never);

    const result = await creditScoringService.getOrComputeScore('farmer-1', 'token');

    expect(result.score).toBe(72);
    expect(result.band).toBe('B');
    expect(mockGetFarmerHarvests).not.toHaveBeenCalled();
    expect(mockUpsertCreditScore).not.toHaveBeenCalled();
  });

  it('computes score when no existing score in DB', async () => {
    mockFindCreditScore.mockResolvedValue(null);
    mockGetFarmerHarvests.mockResolvedValue([]);
    mockGetFarmerInputs.mockResolvedValue([]);
    mockGetFarmerActivities.mockResolvedValue([]);
    mockUpsertCreditScore.mockResolvedValue(fakeScoreRow as never);

    const result = await creditScoringService.getOrComputeScore('farmer-1', 'token');

    expect(mockGetFarmerHarvests).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(72);
  });
});
