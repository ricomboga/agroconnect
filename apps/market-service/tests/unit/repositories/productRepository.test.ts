const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@agroconnect/db/market', () => ({
  prisma: {
    supplierProduct: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

import * as repo from '../../../src/repositories/productRepository';

const BASE_PRODUCT = {
  id: 'prod-001',
  supplierId: 'supplier-001',
  name: 'Urea',
  isActive: true,
};

beforeEach(() => jest.clearAllMocks());

describe('productRepository.createProduct', () => {
  it('calls prisma.supplierProduct.create with correct data', async () => {
    mockCreate.mockResolvedValue(BASE_PRODUCT);
    const dto = {
      name: 'Urea',
      category: 'fertiliser' as const,
      description: '50kg bag',
      unit: 'bag',
      pricePerUnitKes: 3800,
      stockQuantity: 100,
      countyAvailability: ['Nakuru'],
    };
    const result = await repo.createProduct('supplier-001', dto);
    expect(result).toEqual(BASE_PRODUCT);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ supplierId: 'supplier-001', name: 'Urea' }),
    });
  });
});

describe('productRepository.findProducts', () => {
  it('queries with isActive true by default', async () => {
    mockFindMany.mockResolvedValue([BASE_PRODUCT]);
    await repo.findProducts({ page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });

  it('applies category filter', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findProducts({ category: 'fertiliser', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'fertiliser' }) }),
    );
  });

  it('applies county filter via array_contains', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findProducts({ county: 'Nakuru', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    const call = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where['countyAvailability']).toEqual({ array_contains: ['Nakuru'] });
  });
});

describe('productRepository.countProducts', () => {
  it('returns count', async () => {
    mockCount.mockResolvedValue(7);
    const result = await repo.countProducts({ page: 1, page_size: 20 });
    expect(result).toBe(7);
  });
});

describe('productRepository.findProductById', () => {
  it('returns product by id', async () => {
    mockFindUnique.mockResolvedValue(BASE_PRODUCT);
    const result = await repo.findProductById('prod-001');
    expect(result).toEqual(BASE_PRODUCT);
  });

  it('returns null when not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await repo.findProductById('missing')).toBeNull();
  });
});

describe('productRepository.updateProduct', () => {
  it('calls prisma.supplierProduct.update', async () => {
    mockUpdate.mockResolvedValue({ ...BASE_PRODUCT, name: 'Updated' });
    await repo.updateProduct('prod-001', { name: 'Updated' });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'prod-001' },
      data: { name: 'Updated' },
    });
  });
});

describe('productRepository.countActiveProductsBySupplier', () => {
  it('counts active products for the supplier', async () => {
    mockCount.mockResolvedValue(4);
    const result = await repo.countActiveProductsBySupplier('supplier-001');
    expect(result).toBe(4);
    expect(mockCount).toHaveBeenCalledWith({ where: { supplierId: 'supplier-001', isActive: true } });
  });
});

describe('productRepository.countLowStockProductsBySupplier', () => {
  it('counts products at or below the threshold', async () => {
    mockCount.mockResolvedValue(2);
    const result = await repo.countLowStockProductsBySupplier('supplier-001', 10);
    expect(result).toBe(2);
    expect(mockCount).toHaveBeenCalledWith({
      where: { supplierId: 'supplier-001', isActive: true, stockQuantity: { lte: 10 } },
    });
  });
});

describe('productRepository.findLowStockProductsBySupplier', () => {
  it('returns low-stock products ordered ascending and bounded by limit', async () => {
    mockFindMany.mockResolvedValue([BASE_PRODUCT]);
    const result = await repo.findLowStockProductsBySupplier('supplier-001', 10, 50);
    expect(result).toEqual([BASE_PRODUCT]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { supplierId: 'supplier-001', isActive: true, stockQuantity: { lte: 10 } },
      orderBy: { stockQuantity: 'asc' },
      take: 50,
    });
  });
});
