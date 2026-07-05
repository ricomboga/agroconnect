import { Request, Response, NextFunction } from 'express';
import * as productionSummaryService from '../../../src/services/productionSummaryService';
import * as internalProductionController from '../../../src/controllers/internalProductionController';

jest.mock('../../../src/services/productionSummaryService', () => ({
  getProductionSummary: jest.fn(),
}));

const mockGetProductionSummary = jest.mocked(productionSummaryService.getProductionSummary);

const fakeSummary = {
  cropHarvests: { totalHarvestedKg: 0, totalSoldKg: 0, totalRevenueKes: 0, byCrop: [] },
  animalProducts: { byType: [] },
  collections: { totalSalesKes: 0, paidKes: 0, pendingKes: 0, byProductType: [] },
};

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return { params: { farmerId: 'farmer-1' }, query: {}, ...overrides } as unknown as Request;
}

function makeRes(): Response {
  const res = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

describe('internalProductionController.getFarmerProductionSummaryHandler', () => {
  it('returns the production summary as JSON', async () => {
    mockGetProductionSummary.mockResolvedValue(fakeSummary as never);

    const req = makeReq();
    const res = makeRes();
    await internalProductionController.getFarmerProductionSummaryHandler(req, res, next);

    expect(mockGetProductionSummary).toHaveBeenCalledWith('farmer-1', { from: undefined, to: undefined });
    expect(res.json).toHaveBeenCalledWith({ data: fakeSummary });
    expect(next).not.toHaveBeenCalled();
  });

  it('parses valid from_date/to_date query params into Dates', async () => {
    mockGetProductionSummary.mockResolvedValue(fakeSummary as never);

    const req = makeReq({ query: { from_date: '2026-01-01', to_date: '2026-06-30' } });
    const res = makeRes();
    await internalProductionController.getFarmerProductionSummaryHandler(req, res, next);

    expect(mockGetProductionSummary).toHaveBeenCalledWith('farmer-1', {
      from: new Date('2026-01-01'),
      to: new Date('2026-06-30'),
    });
  });

  it('forwards a 400 validation error to next when from_date is malformed', async () => {
    const req = makeReq({ query: { from_date: 'not-a-date' } });
    const res = makeRes();
    await internalProductionController.getFarmerProductionSummaryHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(mockGetProductionSummary).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const err = new Error('db error');
    mockGetProductionSummary.mockRejectedValue(err);

    const req = makeReq();
    const res = makeRes();
    await internalProductionController.getFarmerProductionSummaryHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
