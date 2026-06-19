const mockFindMany = jest.fn();

jest.mock('@agroconnect/db/market', () => ({
  prisma: {
    commodityPrice: {
      findMany: mockFindMany,
    },
  },
}));

import * as repo from '../../../src/repositories/priceRepository';

beforeEach(() => jest.clearAllMocks());

describe('priceRepository.findAllPrices', () => {
  it('returns all prices ordered by crop', async () => {
    const prices = [
      { id: '1', crop: 'beans', priceKes: '120', unit: 'kg', updatedAt: new Date() },
      { id: '2', crop: 'maize', priceKes: '40', unit: 'kg', updatedAt: new Date() },
    ];
    mockFindMany.mockResolvedValue(prices);
    const result = await repo.findAllPrices();
    expect(result).toEqual(prices);
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { crop: 'asc' } });
  });

  it('returns empty array when no prices', async () => {
    mockFindMany.mockResolvedValue([]);
    expect(await repo.findAllPrices()).toEqual([]);
  });
});
