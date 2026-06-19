jest.mock('../../../src/services/priceService');

import * as priceService from '../../../src/services/priceService';
import * as priceController from '../../../src/controllers/priceController';
import { Request, Response, NextFunction } from 'express';

const mockService = priceService as jest.Mocked<typeof priceService>;

function makeRes() {
  const json = jest.fn();
  return { res: { json } as unknown as Response, json };
}

const next = jest.fn() as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('getCurrentPrices', () => {
  it('returns all prices', async () => {
    const prices = [
      { id: '1', crop: 'maize', priceKes: '40', unit: 'kg', updatedAt: new Date() },
    ];
    mockService.getCurrentPrices.mockResolvedValue(prices);
    const { res, json } = makeRes();
    await priceController.getCurrentPrices({} as Request, res, next);
    expect(json).toHaveBeenCalledWith({ data: prices });
  });

  it('calls next on error', async () => {
    mockService.getCurrentPrices.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await priceController.getCurrentPrices({} as Request, res, next);
    expect(next).toHaveBeenCalled();
  });
});
