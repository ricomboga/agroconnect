import { Response, NextFunction } from 'express';
import * as farmerLenderAssignmentRepo from '../../../src/repositories/farmerLenderAssignmentRepository';
import * as loanPartnerRepo from '../../../src/repositories/loanPartnerRepository';
import * as authClient from '../../../src/clients/authServiceClient';
import * as farmerLenderController from '../../../src/controllers/farmerLenderController';

jest.mock('../../../src/repositories/farmerLenderAssignmentRepository', () => ({
  upsertFarmerLenderAssignment: jest.fn(),
  findAssignmentsByFarmerIds: jest.fn(),
}));
jest.mock('../../../src/repositories/loanPartnerRepository', () => ({
  findAllPartners: jest.fn(),
  findPartnersByIds: jest.fn(),
}));
jest.mock('../../../src/clients/authServiceClient', () => ({
  resolveUsersByIdentifiers: jest.fn(),
}));

const mockUpsert = jest.mocked(farmerLenderAssignmentRepo.upsertFarmerLenderAssignment);
const mockFindAssignmentsByFarmerIds = jest.mocked(farmerLenderAssignmentRepo.findAssignmentsByFarmerIds);
const mockFindAllPartners = jest.mocked(loanPartnerRepo.findAllPartners);
const mockFindPartnersByIds = jest.mocked(loanPartnerRepo.findPartnersByIds);
const mockResolveUsers = jest.mocked(authClient.resolveUsersByIdentifiers);

function makeReq(body: Record<string, unknown> = {}) {
  return { user: { id: 'admin-1', role: 'admin' }, params: {}, body } as unknown as Parameters<
    typeof farmerLenderController.bulkAssignLender
  >[0];
}

function makeGetReq(query: Record<string, unknown> = {}) {
  return { query } as unknown as Parameters<typeof farmerLenderController.getFarmerLenderMap>[0];
}

function makeRes(): Response {
  const res = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

describe('farmerLenderController.getFarmerLenderMap', () => {
  it('returns an empty map when no farmerIds are given', async () => {
    const res = makeRes();
    await farmerLenderController.getFarmerLenderMap(makeGetReq(), res, next);

    expect(mockFindAssignmentsByFarmerIds).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ data: {} });
  });

  it('maps assigned farmers to their lender name, and omits unassigned ones', async () => {
    mockFindAssignmentsByFarmerIds.mockResolvedValue([
      { farmerId: 'farmer-1', lenderId: 'ngo-1' },
    ] as never);
    mockFindPartnersByIds.mockResolvedValue([{ id: 'ngo-1', name: 'Hope Foundation' }] as never);

    const res = makeRes();
    await farmerLenderController.getFarmerLenderMap(
      makeGetReq({ farmerIds: 'farmer-1,farmer-2' }),
      res,
      next,
    );

    expect(mockFindAssignmentsByFarmerIds).toHaveBeenCalledWith(['farmer-1', 'farmer-2']);
    expect(res.json).toHaveBeenCalledWith({
      data: { 'farmer-1': { lenderId: 'ngo-1', lenderName: 'Hope Foundation' } },
    });
  });

  it('silently drops an assignment whose partner no longer exists', async () => {
    mockFindAssignmentsByFarmerIds.mockResolvedValue([
      { farmerId: 'farmer-1', lenderId: 'deleted-partner' },
    ] as never);
    mockFindPartnersByIds.mockResolvedValue([] as never);

    const res = makeRes();
    await farmerLenderController.getFarmerLenderMap(makeGetReq({ farmerIds: 'farmer-1' }), res, next);

    expect(res.json).toHaveBeenCalledWith({ data: {} });
  });
});

describe('farmerLenderController.bulkAssignLender', () => {
  it('flags a row whose lender name matches no active partner', async () => {
    mockFindAllPartners.mockResolvedValue([{ id: 'ngo-1', name: 'Hope Foundation' }] as never);

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(
      makeReq({ rows: [{ identifier: '+254700000001', lenderName: 'Nonexistent NGO' }] }),
      res,
      next,
    );

    expect(mockResolveUsers).toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.results).toEqual([
      { identifier: '+254700000001', lenderName: 'Nonexistent NGO', status: 'lender_not_found' },
    ]);
  });

  it('matches lender names case-insensitively', async () => {
    mockFindAllPartners.mockResolvedValue([{ id: 'ngo-1', name: 'Hope Foundation' }] as never);
    mockResolveUsers.mockResolvedValue({ '+254700000001': { id: 'farmer-1', fullName: 'Jane', role: 'farmer' } });

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(
      makeReq({ rows: [{ identifier: '+254700000001', lenderName: 'hope foundation' }] }),
      res,
      next,
    );

    expect(mockUpsert).toHaveBeenCalledWith('farmer-1', 'ngo-1');
  });

  it('assigns matched farmers, and flags not-found / non-farmer rows individually, per their own lender', async () => {
    mockFindAllPartners.mockResolvedValue([
      { id: 'ngo-1', name: 'Hope Foundation' },
      { id: 'sacco-1', name: 'Nakuru SACCO' },
    ] as never);
    mockResolveUsers.mockResolvedValue({
      '+254700000001': { id: 'farmer-1', fullName: 'Jane', role: 'farmer' },
      '11111111': null,
      '+254700000002': { id: 'lender-1', fullName: 'A Bank Officer', role: 'lender' },
    });

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(
      makeReq({
        rows: [
          { identifier: '+254700000001', lenderName: 'Hope Foundation' },
          { identifier: '11111111', lenderName: 'Nakuru SACCO' },
          { identifier: '+254700000002', lenderName: 'Hope Foundation' },
        ],
      }),
      res,
      next,
    );

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith('farmer-1', 'ngo-1');
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.assignedCount).toBe(1);
    expect(payload.data.results).toEqual([
      { identifier: '+254700000001', lenderName: 'Hope Foundation', status: 'assigned', fullName: 'Jane' },
      { identifier: '11111111', lenderName: 'Nakuru SACCO', status: 'not_found' },
      { identifier: '+254700000002', lenderName: 'Hope Foundation', status: 'not_a_farmer', fullName: 'A Bank Officer' },
    ]);
  });

  it('deduplicates identifiers before resolving, even across different target lenders', async () => {
    mockFindAllPartners.mockResolvedValue([
      { id: 'ngo-1', name: 'Hope Foundation' },
      { id: 'sacco-1', name: 'Nakuru SACCO' },
    ] as never);
    mockResolveUsers.mockResolvedValue({ '+254700000001': { id: 'farmer-1', fullName: 'Jane', role: 'farmer' } });

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(
      makeReq({
        rows: [
          { identifier: '+254700000001', lenderName: 'Hope Foundation' },
          { identifier: ' +254700000001 '.trim(), lenderName: 'Nakuru SACCO' },
        ],
      }),
      res,
      next,
    );

    expect(mockResolveUsers).toHaveBeenCalledWith(['+254700000001']);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });
});
