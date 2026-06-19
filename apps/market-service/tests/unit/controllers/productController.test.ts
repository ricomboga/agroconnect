jest.mock('../../../src/services/productService');

import * as productService from '../../../src/services/productService';
import * as productController from '../../../src/controllers/productController';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/types/index';

const mockService = productService as jest.Mocked<typeof productService>;

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, json, status };
}

function authReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    user: { id: 'supplier-001', role: 'supplier', isVerified: true, phone: '+254700000001' },
    params: {},
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = jest.fn() as NextFunction;

const BASE_PRODUCT = {
  id: 'prod-001',
  supplierId: 'supplier-001',
  name: 'Urea',
  category: 'fertiliser' as const,
  brand: null,
  description: '50kg bag',
  unit: 'bag',
  pricePerUnitKes: '3800',
  stockQuantity: '100',
  sku: null,
  countyAvailability: ['Nakuru'],
  photos: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('browseProducts', () => {
  it('returns data and meta', async () => {
    const meta = { page: 1, page_size: 20, total: 1, total_pages: 1 };
    mockService.browseProducts.mockResolvedValue({ products: [BASE_PRODUCT], meta });
    const { res, json } = makeRes();
    await productController.browseProducts({} as Request, res, next);
    expect(json).toHaveBeenCalledWith({ data: [BASE_PRODUCT], meta });
  });

  it('calls next on error', async () => {
    mockService.browseProducts.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await productController.browseProducts({} as Request, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createProduct', () => {
  it('responds 201 with created product', async () => {
    mockService.createProduct.mockResolvedValue(BASE_PRODUCT);
    const { res, status } = makeRes();
    await productController.createProduct(authReq(), res, next);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('calls next on error', async () => {
    mockService.createProduct.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await productController.createProduct(authReq(), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('updateProduct', () => {
  it('returns updated product', async () => {
    const updated = { ...BASE_PRODUCT, name: 'Updated' };
    mockService.updateProduct.mockResolvedValue(updated);
    const { res, json } = makeRes();
    const req = authReq({ params: { productId: 'prod-001' }, body: { name: 'Updated' } });
    await productController.updateProduct(req, res, next);
    expect(json).toHaveBeenCalledWith({ data: updated });
  });

  it('calls next on error', async () => {
    mockService.updateProduct.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await productController.updateProduct(authReq({ params: { productId: 'x' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});
