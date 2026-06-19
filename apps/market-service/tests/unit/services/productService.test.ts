jest.mock('../../../src/repositories/productRepository');

import * as productRepo from '../../../src/repositories/productRepository';
import * as productService from '../../../src/services/productService';

const mockRepo = productRepo as jest.Mocked<typeof productRepo>;

const SUPPLIER_ID = 'supplier-001';
const OTHER_SUPPLIER_ID = 'supplier-002';

const BASE_PRODUCT = {
  id: 'prod-001',
  supplierId: SUPPLIER_ID,
  name: 'Urea Fertiliser',
  category: 'fertiliser' as const,
  brand: 'YaraBela',
  description: '50kg bag of urea',
  unit: 'bag',
  pricePerUnitKes: '3800',
  stockQuantity: '100',
  sku: 'UREA-50KG',
  countyAvailability: ['Nakuru', 'Nairobi'],
  photos: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('productService.browseProducts', () => {
  it('returns paginated products with meta', async () => {
    mockRepo.findProducts.mockResolvedValue([BASE_PRODUCT]);
    mockRepo.countProducts.mockResolvedValue(1);
    const result = await productService.browseProducts({ page: 1, page_size: 20 });
    expect(result.products).toHaveLength(1);
    expect(result.meta).toMatchObject({ page: 1, page_size: 20, total: 1 });
  });
});

describe('productService.createProduct', () => {
  it('delegates to repo and returns new product', async () => {
    mockRepo.createProduct.mockResolvedValue(BASE_PRODUCT);
    const dto = {
      name: 'Urea Fertiliser',
      category: 'fertiliser' as const,
      description: '50kg bag of urea',
      unit: 'bag',
      pricePerUnitKes: 3800,
      stockQuantity: 100,
      countyAvailability: ['Nakuru'],
    };
    const result = await productService.createProduct(SUPPLIER_ID, dto);
    expect(result).toEqual(BASE_PRODUCT);
    expect(mockRepo.createProduct).toHaveBeenCalledWith(SUPPLIER_ID, dto);
  });
});

describe('productService.updateProduct', () => {
  it('updates product when ownership matches', async () => {
    const updated = { ...BASE_PRODUCT, name: 'Updated Name' };
    mockRepo.findProductById.mockResolvedValue(BASE_PRODUCT);
    mockRepo.updateProduct.mockResolvedValue(updated);
    const result = await productService.updateProduct('prod-001', SUPPLIER_ID, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('throws 404 when product does not exist', async () => {
    mockRepo.findProductById.mockResolvedValue(null);
    await expect(
      productService.updateProduct('missing', SUPPLIER_ID, { name: 'x' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'PRODUCT_NOT_FOUND' });
  });

  it('throws 403 when supplierId does not match', async () => {
    mockRepo.findProductById.mockResolvedValue(BASE_PRODUCT);
    await expect(
      productService.updateProduct('prod-001', OTHER_SUPPLIER_ID, { name: 'x' }),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });
});
