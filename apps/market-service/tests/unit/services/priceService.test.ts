jest.mock('../../../src/repositories/priceRepository');

import * as priceRepo from '../../../src/repositories/priceRepository';
import * as priceService from '../../../src/services/priceService';

const mockRepo = priceRepo as jest.Mocked<typeof priceRepo>;

describe('priceService.getCurrentPrices', () => {
  it('returns all commodity prices from repo', async () => {
    const prices = [
      { id: '1', crop: 'maize', priceKes: '40', unit: 'kg', updatedAt: new Date() },
      { id: '2', crop: 'beans', priceKes: '120', unit: 'kg', updatedAt: new Date() },
    ];
    mockRepo.findAllPrices.mockResolvedValue(prices);
    const result = await priceService.getCurrentPrices();
    expect(result).toEqual(prices);
    expect(mockRepo.findAllPrices).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no prices exist', async () => {
    mockRepo.findAllPrices.mockResolvedValue([]);
    const result = await priceService.getCurrentPrices();
    expect(result).toEqual([]);
  });
});
