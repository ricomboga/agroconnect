import * as loanPartnerRepo from '../../../src/repositories/loanPartnerRepository';
import * as farmerLenderAssignmentRepo from '../../../src/repositories/farmerLenderAssignmentRepository';
import * as farmClient from '../../../src/clients/farmServiceClient';
import * as farmerRosterService from '../../../src/services/farmerRosterService';

jest.mock('../../../src/repositories/loanPartnerRepository', () => ({
  findPartnerById: jest.fn(),
}));
jest.mock('../../../src/repositories/farmerLenderAssignmentRepository', () => ({
  findFarmerIdsByLender: jest.fn(),
}));
jest.mock('../../../src/clients/farmServiceClient', () => ({
  getFarmersByCounties: jest.fn(),
}));

const mockFindPartnerById = jest.mocked(loanPartnerRepo.findPartnerById);
const mockFindFarmerIdsByLender = jest.mocked(farmerLenderAssignmentRepo.findFarmerIdsByLender);
const mockGetFarmersByCounties = jest.mocked(farmClient.getFarmersByCounties);

beforeEach(() => jest.clearAllMocks());

describe('farmerRosterService.resolveFarmerIds', () => {
  it('returns explicitIds unchanged when given, without hitting any repo', async () => {
    const result = await farmerRosterService.resolveFarmerIds('bank-1', ['farmer-x']);
    expect(result).toEqual(['farmer-x']);
    expect(mockFindPartnerById).not.toHaveBeenCalled();
  });

  it('resolves banks/MFIs/saccos purely via FarmerLenderAssignment', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'bank', operatingCounties: [] } as never);
    mockFindFarmerIdsByLender.mockResolvedValue(['farmer-1', 'farmer-2']);

    const result = await farmerRosterService.resolveFarmerIds('bank-1');

    expect(result).toEqual(['farmer-1', 'farmer-2']);
    expect(mockGetFarmersByCounties).not.toHaveBeenCalled();
  });

  it('unions county-based roster with explicit assignments for ngo_grant partners', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'ngo_grant', operatingCounties: ['Nakuru'] } as never);
    mockGetFarmersByCounties.mockResolvedValue([{ farmerId: 'farmer-1' }, { farmerId: 'farmer-2' }] as never);
    mockFindFarmerIdsByLender.mockResolvedValue(['farmer-2', 'farmer-3']);

    const result = await farmerRosterService.resolveFarmerIds('ngo-1');

    expect(new Set(result)).toEqual(new Set(['farmer-1', 'farmer-2', 'farmer-3']));
    expect(result).toHaveLength(3);
  });

  it('ngo_grant with no operatingCounties still returns explicitly-assigned farmers', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'ngo_grant', operatingCounties: [] } as never);
    mockFindFarmerIdsByLender.mockResolvedValue(['farmer-9']);

    const result = await farmerRosterService.resolveFarmerIds('ngo-1');

    expect(result).toEqual(['farmer-9']);
    expect(mockGetFarmersByCounties).not.toHaveBeenCalled();
  });
});

describe('farmerRosterService.isRosterConfigured', () => {
  it('is always true for non-NGO partner types', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'bank', operatingCounties: [] } as never);
    await expect(farmerRosterService.isRosterConfigured('bank-1')).resolves.toBe(true);
  });

  it('is true for ngo_grant with operatingCounties configured', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'ngo_grant', operatingCounties: ['Nakuru'] } as never);
    await expect(farmerRosterService.isRosterConfigured('ngo-1')).resolves.toBe(true);
  });

  it('is true for ngo_grant with no counties but at least one explicit assignment', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'ngo_grant', operatingCounties: [] } as never);
    mockFindFarmerIdsByLender.mockResolvedValue(['farmer-1']);
    await expect(farmerRosterService.isRosterConfigured('ngo-1')).resolves.toBe(true);
  });

  it('is false for ngo_grant with no counties and no explicit assignments', async () => {
    mockFindPartnerById.mockResolvedValue({ type: 'ngo_grant', operatingCounties: [] } as never);
    mockFindFarmerIdsByLender.mockResolvedValue([]);
    await expect(farmerRosterService.isRosterConfigured('ngo-1')).resolves.toBe(false);
  });
});
