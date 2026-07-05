import * as productionSummaryService from '../../../src/services/productionSummaryService';

const mockFarmFindMany = jest.fn();
const mockHarvestFindMany = jest.fn();
const mockAnimalProductFindMany = jest.fn();
const mockCollectionFindMany = jest.fn();

jest.mock('@agroconnect/db/farm', () => ({
  prisma: {
    farm: { findMany: (...args: unknown[]) => mockFarmFindMany(...args) },
    harvest: { findMany: (...args: unknown[]) => mockHarvestFindMany(...args) },
    animalProductRecord: { findMany: (...args: unknown[]) => mockAnimalProductFindMany(...args) },
    customerCollection: { findMany: (...args: unknown[]) => mockCollectionFindMany(...args) },
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('productionSummaryService.getProductionSummary', () => {
  it('returns an empty summary when the farmer owns no farms', async () => {
    mockFarmFindMany.mockResolvedValue([]);

    const result = await productionSummaryService.getProductionSummary('farmer-1');

    expect(result.cropHarvests.byCrop).toEqual([]);
    expect(result.animalProducts.byType).toEqual([]);
    expect(result.collections.byProductType).toEqual([]);
    expect(mockHarvestFindMany).not.toHaveBeenCalled();
  });

  it('aggregates harvested/sold kg and revenue per crop across multiple farms', async () => {
    mockFarmFindMany.mockResolvedValue([{ id: 'farm-1' }, { id: 'farm-2' }]);
    mockHarvestFindMany.mockResolvedValue([
      { crop: 'maize', quantityKg: '100.00', soldQuantityKg: '80.00', totalRevenueKes: '8000.00' },
      { crop: 'maize', quantityKg: '50.00', soldQuantityKg: '50.00', totalRevenueKes: '5000.00' },
      { crop: 'beans', quantityKg: '30.00', soldQuantityKg: '10.00', totalRevenueKes: '1000.00' },
    ]);
    mockAnimalProductFindMany.mockResolvedValue([]);
    mockCollectionFindMany.mockResolvedValue([]);

    const result = await productionSummaryService.getProductionSummary('farmer-1');

    expect(result.cropHarvests.totalHarvestedKg).toBe(180);
    expect(result.cropHarvests.totalSoldKg).toBe(140);
    expect(result.cropHarvests.totalRevenueKes).toBe(14000);
    expect(result.cropHarvests.byCrop).toEqual(
      expect.arrayContaining([
        { cropName: 'maize', harvestedKg: 150, soldKg: 130, revenueKes: 13000 },
        { cropName: 'beans', harvestedKg: 30, soldKg: 10, revenueKes: 1000 },
      ]),
    );
  });

  it('computes animal product revenue as soldQty * pricePerUnit, not full quantity', async () => {
    mockFarmFindMany.mockResolvedValue([{ id: 'farm-1' }]);
    mockHarvestFindMany.mockResolvedValue([]);
    mockAnimalProductFindMany.mockResolvedValue([
      { productType: 'eggs', unit: 'trays', quantity: '20', soldQty: '15', pricePerUnit: '400' },
      { productType: 'eggs', unit: 'trays', quantity: '10', soldQty: '5', pricePerUnit: '400' },
      { productType: 'cow_milk', unit: 'litres', quantity: '100', soldQty: '100', pricePerUnit: '60' },
    ]);
    mockCollectionFindMany.mockResolvedValue([]);

    const result = await productionSummaryService.getProductionSummary('farmer-1');

    expect(result.animalProducts.byType).toEqual(
      expect.arrayContaining([
        { productType: 'eggs', unit: 'trays', totalQty: 30, soldQty: 20, revenueKes: 8000 },
        { productType: 'cow_milk', unit: 'litres', totalQty: 100, soldQty: 100, revenueKes: 6000 },
      ]),
    );
  });

  it('splits collection totals into paid vs pending based on isPaid', async () => {
    mockFarmFindMany.mockResolvedValue([{ id: 'farm-1' }]);
    mockHarvestFindMany.mockResolvedValue([]);
    mockAnimalProductFindMany.mockResolvedValue([]);
    mockCollectionFindMany.mockResolvedValue([
      { productType: 'milk', quantity: '10', unit: 'litres', totalAmount: '600', isPaid: true },
      { productType: 'milk', quantity: '5', unit: 'litres', totalAmount: '300', isPaid: false },
    ]);

    const result = await productionSummaryService.getProductionSummary('farmer-1');

    expect(result.collections.totalSalesKes).toBe(900);
    expect(result.collections.paidKes).toBe(600);
    expect(result.collections.pendingKes).toBe(300);
  });

  it('scopes farm lookup to the given farmer and filters out soft-deleted farms', async () => {
    mockFarmFindMany.mockResolvedValue([]);

    await productionSummaryService.getProductionSummary('farmer-42');

    expect(mockFarmFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'farmer-42', deletedAt: null } }),
    );
  });

  it('forwards a from/to date range to all three queries', async () => {
    mockFarmFindMany.mockResolvedValue([{ id: 'farm-1' }]);
    mockHarvestFindMany.mockResolvedValue([]);
    mockAnimalProductFindMany.mockResolvedValue([]);
    mockCollectionFindMany.mockResolvedValue([]);

    const from = new Date('2026-01-01');
    const to = new Date('2026-06-30');
    await productionSummaryService.getProductionSummary('farmer-1', { from, to });

    expect(mockHarvestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ harvestDate: { gte: from, lte: to } }),
      }),
    );
    expect(mockAnimalProductFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ date: { gte: from, lte: to } }) }),
    );
    expect(mockCollectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ takenDate: { gte: from, lte: to } }) }),
    );
  });
});
