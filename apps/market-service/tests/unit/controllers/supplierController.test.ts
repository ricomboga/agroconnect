jest.mock('../../../src/services/orderService');
jest.mock('../../../src/services/productService');

import * as orderService from '../../../src/services/orderService';
import * as productService from '../../../src/services/productService';
import * as supplierController from '../../../src/controllers/supplierController';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/types/index';

const mockOrderService = orderService as jest.Mocked<typeof orderService>;
const mockProductService = productService as jest.Mocked<typeof productService>;

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

beforeEach(() => jest.clearAllMocks());

describe('getMyOrders', () => {
  it('returns orders scoped to the authenticated supplier with meta', async () => {
    const meta = { page: 1, page_size: 20, total: 1, total_pages: 1 };
    const order = {
      id: 'order-001',
      buyerId: 'buyer-001',
      supplierId: 'supplier-001',
      productId: 'prod-001',
      quantityUnits: '10',
      unitPriceKes: '3800',
      totalPriceKes: '38000',
      deliveryAddress: 'Nakuru',
      notes: null,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockOrderService.listSupplierOrders.mockResolvedValue({ orders: [order], meta });
    const { res, json } = makeRes();
    await supplierController.getMyOrders(authReq(), res, next);
    expect(mockOrderService.listSupplierOrders).toHaveBeenCalledWith('supplier-001', {});
    expect(json).toHaveBeenCalledWith({ data: [order], meta });
  });

  it('calls next on error', async () => {
    mockOrderService.listSupplierOrders.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await supplierController.getMyOrders(authReq(), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('getMyCustomers', () => {
  it('returns customer aggregates with meta', async () => {
    const meta = { page: 1, page_size: 20, total: 1, total_pages: 1 };
    const customer = {
      buyerId: 'buyer-001',
      orderCount: 3,
      totalSpentKes: 11400,
      lastOrderAt: new Date(),
    };
    mockOrderService.getSupplierCustomers.mockResolvedValue({ customers: [customer], meta });
    const { res, json } = makeRes();
    await supplierController.getMyCustomers(authReq(), res, next);
    expect(mockOrderService.getSupplierCustomers).toHaveBeenCalledWith('supplier-001', {});
    expect(json).toHaveBeenCalledWith({ data: [customer], meta });
  });

  it('calls next on error', async () => {
    mockOrderService.getSupplierCustomers.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await supplierController.getMyCustomers(authReq(), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('getMySummary', () => {
  it('returns the KPI summary', async () => {
    const summary = {
      activeProductCount: 5,
      lowStockCount: 2,
      lowStockItems: [],
      revenueMonthKes: 0,
      revenueTrend: [],
      topProducts: [],
    };
    mockProductService.getSupplierSummary.mockResolvedValue(summary);
    const { res, json } = makeRes();
    await supplierController.getMySummary(authReq(), res, next);
    expect(mockProductService.getSupplierSummary).toHaveBeenCalledWith('supplier-001', {});
    expect(json).toHaveBeenCalledWith({ data: summary });
  });

  it('calls next on error', async () => {
    mockProductService.getSupplierSummary.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await supplierController.getMySummary(authReq(), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('getOrdersForAdmin', () => {
  it('scopes to the supplierId path param, not the caller', async () => {
    const meta = { page: 1, page_size: 20, total: 0, total_pages: 1 };
    mockOrderService.listSupplierOrders.mockResolvedValue({ orders: [], meta });
    const { res, json } = makeRes();
    await supplierController.getOrdersForAdmin(
      authReq({ user: { id: 'admin-001', role: 'admin', isVerified: true, phone: '+254700000002' } as never, params: { supplierId: 'supplier-999' } }),
      res,
      next,
    );
    expect(mockOrderService.listSupplierOrders).toHaveBeenCalledWith('supplier-999', {});
    expect(json).toHaveBeenCalledWith({ data: [], meta });
  });
});

describe('getCustomersForAdmin', () => {
  it('scopes to the supplierId path param, not the caller', async () => {
    const meta = { page: 1, page_size: 20, total: 0, total_pages: 1 };
    mockOrderService.getSupplierCustomers.mockResolvedValue({ customers: [], meta });
    const { res, json } = makeRes();
    await supplierController.getCustomersForAdmin(
      authReq({ user: { id: 'admin-001', role: 'admin', isVerified: true, phone: '+254700000002' } as never, params: { supplierId: 'supplier-999' } }),
      res,
      next,
    );
    expect(mockOrderService.getSupplierCustomers).toHaveBeenCalledWith('supplier-999', {});
    expect(json).toHaveBeenCalledWith({ data: [], meta });
  });
});

describe('getSummaryForAdmin', () => {
  it('scopes to the supplierId path param, not the caller', async () => {
    const summary = {
      activeProductCount: 3,
      lowStockCount: 1,
      lowStockItems: [],
      revenueMonthKes: 0,
      revenueTrend: [],
      topProducts: [],
    };
    mockProductService.getSupplierSummary.mockResolvedValue(summary);
    const { res, json } = makeRes();
    await supplierController.getSummaryForAdmin(
      authReq({ user: { id: 'admin-001', role: 'admin', isVerified: true, phone: '+254700000002' } as never, params: { supplierId: 'supplier-999' } }),
      res,
      next,
    );
    expect(mockProductService.getSupplierSummary).toHaveBeenCalledWith('supplier-999', {});
    expect(json).toHaveBeenCalledWith({ data: summary });
  });

  it('calls next on error', async () => {
    mockProductService.getSupplierSummary.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await supplierController.getSummaryForAdmin(
      authReq({ params: { supplierId: 'supplier-999' } }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });
});
