import { Response, NextFunction } from 'express';
import * as farmerLenderAssignmentRepo from '../../../src/repositories/farmerLenderAssignmentRepository';
import * as loanPartnerRepo from '../../../src/repositories/loanPartnerRepository';
import * as authClient from '../../../src/clients/authServiceClient';
import * as farmerLenderController from '../../../src/controllers/farmerLenderController';

jest.mock('../../../src/repositories/farmerLenderAssignmentRepository', () => ({
  upsertFarmerLenderAssignment: jest.fn(),
}));
jest.mock('../../../src/repositories/loanPartnerRepository', () => ({
  findPartnerById: jest.fn(),
}));
jest.mock('../../../src/clients/authServiceClient', () => ({
  resolveUsersByIdentifiers: jest.fn(),
}));

const mockUpsert = jest.mocked(farmerLenderAssignmentRepo.upsertFarmerLenderAssignment);
const mockFindPartnerById = jest.mocked(loanPartnerRepo.findPartnerById);
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
  it('404s when the lender/NGO does not exist', async () => {
    mockFindPartnerById.mockResolvedValue(null);

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(makeReq({ lenderId: 'ngo-1', identifiers: ['+254700000001'] }), res, next);

    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(mockResolveUsers).not.toHaveBeenCalled();
  });

  it('assigns matched farmers, flags not-found and non-farmer rows individually', async () => {
    mockFindPartnerById.mockResolvedValue({ id: 'ngo-1', type: 'ngo_grant' } as never);
    mockResolveUsers.mockResolvedValue({
      '+254700000001': { id: 'farmer-1', fullName: 'Jane', role: 'farmer' },
      '11111111': null,
      '+254700000002': { id: 'lender-1', fullName: 'A Bank Officer', role: 'lender' },
    });

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(
      makeReq({ lenderId: 'ngo-1', identifiers: ['+254700000001', '11111111', '+254700000002'] }),
      res,
      next,
    );

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith('farmer-1', 'ngo-1');
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.assignedCount).toBe(1);
    expect(payload.data.results).toEqual([
      { identifier: '+254700000001', status: 'assigned', fullName: 'Jane' },
      { identifier: '11111111', status: 'not_found' },
      { identifier: '+254700000002', status: 'not_a_farmer', fullName: 'A Bank Officer' },
    ]);
  });

  it('deduplicates identifiers before resolving', async () => {
    mockFindPartnerById.mockResolvedValue({ id: 'ngo-1', type: 'ngo_grant' } as never);
    mockResolveUsers.mockResolvedValue({ '+254700000001': { id: 'farmer-1', fullName: 'Jane', role: 'farmer' } });

    const res = makeRes();
    await farmerLenderController.bulkAssignLender(
      makeReq({ lenderId: 'ngo-1', identifiers: ['+254700000001', '+254700000001', ' +254700000001 '.trim()] }),
      res,
      next,
    );

    expect(mockResolveUsers).toHaveBeenCalledWith(['+254700000001']);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});
