import { Response, NextFunction } from 'express';
import * as transactionRepo from '../../../src/repositories/transactionRepository';
import * as authClient from '../../../src/clients/authServiceClient';
import * as farmClient from '../../../src/clients/farmServiceClient';
import * as farmerRosterService from '../../../src/services/farmerRosterService';
import * as lenderReportsController from '../../../src/controllers/lenderReportsController';

jest.mock('../../../src/repositories/transactionRepository', () => ({
  findTransactionsByFarmerIdsInRange: jest.fn(),
}));
jest.mock('../../../src/clients/authServiceClient', () => ({
  getUserProfiles: jest.fn(),
}));
jest.mock('../../../src/clients/farmServiceClient', () => ({
  getFarmerInventoryReport: jest.fn(),
}));
jest.mock('../../../src/services/farmerRosterService', () => ({
  resolveFarmerIds: jest.fn(),
  isRosterConfigured: jest.fn(),
}));

const mockFindTransactions = jest.mocked(transactionRepo.findTransactionsByFarmerIdsInRange);
const mockGetUserProfiles = jest.mocked(authClient.getUserProfiles);
const mockGetFarmerInventoryReport = jest.mocked(farmClient.getFarmerInventoryReport);
const mockResolveFarmerIds = jest.mocked(farmerRosterService.resolveFarmerIds);
const mockIsRosterConfigured = jest.mocked(farmerRosterService.isRosterConfigured);

function makeReq(query: Record<string, unknown> = {}) {
  return {
    user: { id: 'lender-user-1', role: 'lender', partner_bank_id: 'bank-1', phone: '+254700000001' },
    params: {},
    query,
  } as unknown as Parameters<typeof lenderReportsController.getIncomeStatementReportHandler>[0];
}

function makeRes(): Response {
  const res = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

describe('lenderReportsController.getIncomeStatementReportHandler', () => {
  it('returns combined totals for the full roster when no national_id is given', async () => {
    mockResolveFarmerIds.mockResolvedValue(['farmer-1', 'farmer-2']);
    mockIsRosterConfigured.mockResolvedValue(true);
    mockGetUserProfiles.mockResolvedValue({
      'farmer-1': { fullName: 'Jane', phone: '+254700000002', idNumber: '11111111', county: null, subCounty: null },
      'farmer-2': { fullName: 'John', phone: '+254700000003', idNumber: '22222222', county: null, subCounty: null },
    });
    mockFindTransactions.mockResolvedValue([
      { farmerId: 'farmer-1', type: 'income', amountKes: 1000 },
      { farmerId: 'farmer-2', type: 'expense', amountKes: 400 },
    ] as never);

    const res = makeRes();
    await lenderReportsController.getIncomeStatementReportHandler(makeReq(), res, next);

    expect(mockFindTransactions).toHaveBeenCalledWith(['farmer-1', 'farmer-2'], { fromDate: undefined, toDate: undefined });
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.rows).toHaveLength(2);
    expect(payload.data.combined).toEqual({ totalIncomeKes: 1000, totalExpenseKes: 400, netIncomeKes: 600 });
  });

  it('scopes the report to the single farmer matching national_id', async () => {
    mockResolveFarmerIds.mockResolvedValue(['farmer-1', 'farmer-2']);
    mockIsRosterConfigured.mockResolvedValue(true);
    mockGetUserProfiles.mockResolvedValue({
      'farmer-1': { fullName: 'Jane', phone: '+254700000002', idNumber: '11111111', county: null, subCounty: null },
      'farmer-2': { fullName: 'John', phone: '+254700000003', idNumber: '22222222', county: null, subCounty: null },
    });
    mockFindTransactions.mockResolvedValue([{ farmerId: 'farmer-2', type: 'income', amountKes: 500 }] as never);

    const res = makeRes();
    await lenderReportsController.getIncomeStatementReportHandler(
      makeReq({ national_id: '22222222', from_date: '2026-01-01', to_date: '2026-06-30' }),
      res,
      next,
    );

    expect(mockFindTransactions).toHaveBeenCalledWith(['farmer-2'], { fromDate: '2026-01-01', toDate: '2026-06-30' });
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.rows).toEqual([
      { farmerId: 'farmer-2', fullName: 'John', totalIncomeKes: 500, totalExpenseKes: 0, netIncomeKes: 500 },
    ]);
  });

  it('returns an empty roster when national_id matches nobody', async () => {
    mockResolveFarmerIds.mockResolvedValue(['farmer-1']);
    mockIsRosterConfigured.mockResolvedValue(true);
    mockGetUserProfiles.mockResolvedValue({
      'farmer-1': { fullName: 'Jane', phone: '+254700000002', idNumber: '11111111', county: null, subCounty: null },
    });
    mockFindTransactions.mockResolvedValue([] as never);

    const res = makeRes();
    await lenderReportsController.getIncomeStatementReportHandler(makeReq({ national_id: '99999999' }), res, next);

    expect(mockFindTransactions).toHaveBeenCalledWith([], { fromDate: undefined, toDate: undefined });
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.rows).toEqual([]);
  });
});

describe('lenderReportsController.getInventoryReportHandler', () => {
  it('requires national_id', async () => {
    const res = makeRes();
    await lenderReportsController.getInventoryReportHandler(makeReq(), res, next);

    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('404s when no farmer in the roster matches the national_id', async () => {
    mockResolveFarmerIds.mockResolvedValue(['farmer-1']);
    mockGetUserProfiles.mockResolvedValue({
      'farmer-1': { fullName: 'Jane', phone: '+254700000002', idNumber: '11111111', county: null, subCounty: null },
    });

    const res = makeRes();
    await lenderReportsController.getInventoryReportHandler(makeReq({ national_id: '00000000' }), res, next);

    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(mockGetFarmerInventoryReport).not.toHaveBeenCalled();
  });

  it('returns the matched farmer\'s inventory for the given date range', async () => {
    mockResolveFarmerIds.mockResolvedValue(['farmer-1', 'farmer-2']);
    mockGetUserProfiles.mockResolvedValue({
      'farmer-1': { fullName: 'Jane', phone: '+254700000002', idNumber: '11111111', county: null, subCounty: null },
      'farmer-2': { fullName: 'John', phone: '+254700000003', idNumber: '22222222', county: null, subCounty: null },
    });
    mockGetFarmerInventoryReport.mockResolvedValue([
      { name: 'Fertilizer', category: 'input', unit: 'kg', purchasedQty: 50, remainingQty: 20, purchasedAt: '2026-02-01' },
    ]);

    const res = makeRes();
    await lenderReportsController.getInventoryReportHandler(
      makeReq({ national_id: '22222222', from_date: '2026-01-01', to_date: '2026-06-30' }),
      res,
      next,
    );

    expect(mockGetFarmerInventoryReport).toHaveBeenCalledWith('farmer-2', { fromDate: '2026-01-01', toDate: '2026-06-30' });
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.farmerId).toBe('farmer-2');
    expect(payload.data.fullName).toBe('John');
    expect(payload.data.items).toHaveLength(1);
  });
});
