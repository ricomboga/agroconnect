import { Response, NextFunction } from 'express';
import * as farmerLenderAssignmentRepo from '../../../src/repositories/farmerLenderAssignmentRepository';
import * as loanPartnerRepo from '../../../src/repositories/loanPartnerRepository';
import * as authClient from '../../../src/clients/authServiceClient';
import * as farmerLenderController from '../../../src/controllers/farmerLenderController';

jest.mock('../../../src/repositories/farmerLenderAssignmentRepository', () => ({
  upsertFarmerLenderAssignment: jest.fn(),
}));
jest.mock('../../../src/repositories/loanPartnerRepository', () => ({
  findAllPartners: jest.fn(),
}));
jest.mock('../../../src/clients/authServiceClient', () => ({
  resolveUsersByIdentifiers: jest.fn(),
}));

const mockUpsert = jest.mocked(farmerLenderAssignmentRepo.upsertFarmerLenderAssignment);
const mockFindAllPartners = jest.mocked(loanPartnerRepo.findAllPartners);
const mockResolveUsers = jest.mocked(authClient.resolveUsersByIdentifiers);

function makeReq(body: Record<string, unknown> = {}) {
  return { user: { id: 'admin-1', role: 'admin' }, params: {}, body } as unknown as Parameters<
    typeof farmerLenderController.bulkAssignLender
  >[0];
}

function makeRes(): Response {
  const res = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

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
