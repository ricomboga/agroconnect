import { Response, NextFunction } from 'express';
import * as farmerReportService from '../../../src/services/farmerReportService';
import * as reportController from '../../../src/controllers/reportController';

jest.mock('../../../src/services/farmerReportService', () => ({
  generateFarmerReport: jest.fn(),
}));

const mockGenerateFarmerReport = jest.mocked(farmerReportService.generateFarmerReport);

const fakeReport = {
  farmerId: 'farmer-1',
  period: { fromDate: null, toDate: null },
  transactions: { totalIncomeKes: 0, totalExpenseKes: 0, netKes: 0, recordCount: 0, byCategory: [], byMonth: [] },
  production: {
    cropHarvests: { totalHarvestedKg: 0, totalSoldKg: 0, totalRevenueKes: 0, byCrop: [] },
    monthlyYieldKg: [],
    animalProducts: { byType: [] },
    collections: { totalSalesKes: 0, paidKes: 0, pendingKes: 0, byProductType: [] },
  },
  creditScore: null,
  generatedAt: '2026-07-02T00:00:00.000Z',
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'farmer-1', role: 'farmer', phone: '+254700000001' },
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

describe('reportController.getMyReport', () => {
  it('generates a report for the authenticated farmer and returns it as JSON', async () => {
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeReq();
    const res = makeRes();
    await reportController.getMyReport(req as never, res, next);

    expect(mockGenerateFarmerReport).toHaveBeenCalledWith('farmer-1', { fromDate: undefined, toDate: undefined });
    expect(res.json).toHaveBeenCalledWith({ data: fakeReport });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards from_date/to_date query params', async () => {
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeReq({ query: { from_date: '2026-01-01', to_date: '2026-06-30' } });
    const res = makeRes();
    await reportController.getMyReport(req as never, res, next);

    expect(mockGenerateFarmerReport).toHaveBeenCalledWith('farmer-1', {
      fromDate: '2026-01-01', toDate: '2026-06-30',
    });
  });

  it('forwards errors to next', async () => {
    const err = new Error('report generation failed');
    mockGenerateFarmerReport.mockRejectedValue(err);

    const req = makeReq();
    const res = makeRes();
    await reportController.getMyReport(req as never, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('reportController.getFarmerReportForAdmin', () => {
  function makeAdminReq(overrides: Record<string, unknown> = {}) {
    return {
      params: { farmerId: 'farmer-1' },
      query: {},
      ...overrides,
    };
  }

  it('generates a report for the given farmerId, not the caller', async () => {
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeAdminReq();
    const res = makeRes();
    await reportController.getFarmerReportForAdmin(req as never, res, next);

    expect(mockGenerateFarmerReport).toHaveBeenCalledWith('farmer-1', expect.objectContaining({
      fromDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      toDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
    expect(res.json).toHaveBeenCalledWith({ data: fakeReport });
  });

  it('defaults to a trailing 12-month range when no query params are given', async () => {
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeAdminReq();
    const res = makeRes();
    await reportController.getFarmerReportForAdmin(req as never, res, next);

    const [, range] = mockGenerateFarmerReport.mock.calls[0] as [string, { fromDate: string; toDate: string }];
    const from = new Date(range.fromDate);
    const to = new Date(range.toDate);
    const approxOneYearMs = 365 * 24 * 60 * 60 * 1000;
    expect(to.getTime() - from.getTime()).toBeGreaterThan(approxOneYearMs - 2 * 24 * 60 * 60 * 1000);
    expect(to.getTime() - from.getTime()).toBeLessThan(approxOneYearMs + 2 * 24 * 60 * 60 * 1000);
  });

  it('forwards explicit from_date/to_date query params instead of defaulting', async () => {
    mockGenerateFarmerReport.mockResolvedValue(fakeReport);

    const req = makeAdminReq({ query: { from_date: '2026-01-01', to_date: '2026-06-30' } });
    const res = makeRes();
    await reportController.getFarmerReportForAdmin(req as never, res, next);

    expect(mockGenerateFarmerReport).toHaveBeenCalledWith('farmer-1', {
      fromDate: '2026-01-01', toDate: '2026-06-30',
    });
  });

  it('forwards errors to next', async () => {
    const err = new Error('report generation failed');
    mockGenerateFarmerReport.mockRejectedValue(err);

    const req = makeAdminReq();
    const res = makeRes();
    await reportController.getFarmerReportForAdmin(req as never, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
