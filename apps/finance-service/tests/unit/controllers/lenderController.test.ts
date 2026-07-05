import { Response, NextFunction } from 'express';
import * as loanRepo from '../../../src/repositories/loanRepository';
import * as loanPartnerRepo from '../../../src/repositories/loanPartnerRepository';
import * as farmerReportService from '../../../src/services/farmerReportService';
import * as lenderController from '../../../src/controllers/lenderController';

jest.mock('../../../src/repositories/loanRepository', () => ({
  findLoanByIdForLender: jest.fn(),
}));
jest.mock('../../../src/repositories/loanPartnerRepository', () => ({
  findPartnerById: jest.fn(),
}));
jest.mock('../../../src/services/farmerReportService', () => ({
  generateFarmerReport: jest.fn(),
}));

const mockFindLoanByIdForLender = jest.mocked(loanRepo.findLoanByIdForLender);
const mockFindPartnerById = jest.mocked(loanPartnerRepo.findPartnerById);
const mockGenerateFarmerReport = jest.mocked(farmerReportService.generateFarmerReport);

const fakeLoan = { id: 'loan-1', farmerId: 'farmer-1', partnerBankId: 'bank-1', status: 'submitted' };
const fakeReport = {
  farmerId: 'farmer-1',
  period: { fromDate: null, toDate: null },
  transactions: { totalIncomeKes: 0, totalExpenseKes: 0, netKes: 0, recordCount: 0, byCategory: [], byMonth: [] },
  production: {
    cropHarvests: { totalHarvestedKg: 0, totalSoldKg: 0, totalRevenueKes: 0, byCrop: [] },
    animalProducts: { byType: [] },
    collections: { totalSalesKes: 0, paidKes: 0, pendingKes: 0, byProductType: [] },
  },
  creditScore: null,
  generatedAt: '2026-07-02T00:00:00.000Z',
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'lender-user-1', role: 'lender', partner_bank_id: 'bank-1', phone: '+254700000001' },
    params: { loanId: 'loan-1' },
    query: {},
    ...overrides,
  };
}

function makeRes(): Response {
  const res = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

describe('lenderController.getLenderInstitution', () => {
  it('returns the institution the caller is registered under', async () => {
    mockFindPartnerById.mockResolvedValue({
      id: 'bank-1', name: 'Equity Bank Kenya', type: 'bank',
    } as never);

    const req = makeReq({ params: {} });
    const res = makeRes();
    await lenderController.getLenderInstitution(req as never, res, next);

    expect(mockFindPartnerById).toHaveBeenCalledWith('bank-1');
    expect(res.json).toHaveBeenCalledWith({
      data: { id: 'bank-1', name: 'Equity Bank Kenya', type: 'bank' },
    });
  });

  it('returns 404 when the institution does not exist', async () => {
    mockFindPartnerById.mockResolvedValue(null);

    const req = makeReq({ params: {} });
    const res = makeRes();
    await lenderController.getLenderInstitution(req as never, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, errorCode: 'PARTNER_NOT_FOUND' }));
  });

  it('returns 403 when the caller has no partner_bank_id', async () => {
    const req = makeReq({ user: { id: 'user-1', role: 'farmer', phone: '+254700000001' }, params: {} });
    const res = makeRes();
    await lenderController.getLenderInstitution(req as never, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, errorCode: 'NOT_A_LENDING_PARTNER' }));
    expect(mockFindPartnerById).not.toHaveBeenCalled();
  });
});

describe('lenderController.getLenderFarmerReport', () => {
  it('returns the farmer report for the loan applicant when the loan belongs to the caller bank', async () => {
    mockFindLoanByIdForLender.mockResolvedValue(fakeLoan as never);
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeReq();
    const res = makeRes();
    await lenderController.getLenderFarmerReport(req as never, res, next);

    expect(mockFindLoanByIdForLender).toHaveBeenCalledWith('loan-1', 'bank-1');
    expect(mockGenerateFarmerReport).toHaveBeenCalledWith('farmer-1', { fromDate: undefined, toDate: undefined });
    expect(res.json).toHaveBeenCalledWith({ data: fakeReport });
  });

  it('forwards from_date/to_date query params', async () => {
    mockFindLoanByIdForLender.mockResolvedValue(fakeLoan as never);
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeReq({ query: { from_date: '2026-01-01', to_date: '2026-06-30' } });
    const res = makeRes();
    await lenderController.getLenderFarmerReport(req as never, res, next);

    expect(mockGenerateFarmerReport).toHaveBeenCalledWith('farmer-1', {
      fromDate: '2026-01-01', toDate: '2026-06-30',
    });
  });

  it('returns 404 when the loan does not belong to the caller bank (or does not exist)', async () => {
    mockFindLoanByIdForLender.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    await lenderController.getLenderFarmerReport(req as never, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, errorCode: 'LOAN_NOT_FOUND' }));
    expect(mockGenerateFarmerReport).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller has no partner_bank_id (not a lending partner)', async () => {
    const req = makeReq({ user: { id: 'user-1', role: 'farmer', phone: '+254700000001' } });
    const res = makeRes();
    await lenderController.getLenderFarmerReport(req as never, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, errorCode: 'NOT_A_LENDING_PARTNER' }));
    expect(mockFindLoanByIdForLender).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    mockFindLoanByIdForLender.mockResolvedValue(fakeLoan as never);
    const err = new Error('report generation failed');
    mockGenerateFarmerReport.mockRejectedValue(err);

    const req = makeReq();
    const res = makeRes();
    await lenderController.getLenderFarmerReport(req as never, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
