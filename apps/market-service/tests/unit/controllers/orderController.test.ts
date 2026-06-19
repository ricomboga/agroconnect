jest.mock('../../../src/services/orderService');

import * as orderService from '../../../src/services/orderService';
import * as orderController from '../../../src/controllers/orderController';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/types/index';

const mockService = orderService as jest.Mocked<typeof orderService>;

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, json, status };
}

function authReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    user: { id: 'buyer-001', role: 'buyer', isVerified: true, phone: '+254700000001' },
    params: {},
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = jest.fn() as NextFunction;

const BASE_ORDER = {
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

beforeEach(() => jest.clearAllMocks());

describe('placeOrder', () => {
  it('responds 201 with created order', async () => {
    mockService.placeOrder.mockResolvedValue(BASE_ORDER);
    const { res, status } = makeRes();
    await orderController.placeOrder(authReq(), res, next);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('calls next on error', async () => {
    mockService.placeOrder.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await orderController.placeOrder(authReq(), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('listOrders', () => {
  it('returns orders with meta', async () => {
    const meta = { page: 1, page_size: 20, total: 1, total_pages: 1 };
    mockService.listOrders.mockResolvedValue({ orders: [BASE_ORDER], meta });
    const { res, json } = makeRes();
    await orderController.listOrders(authReq(), res, next);
    expect(json).toHaveBeenCalledWith({ data: [BASE_ORDER], meta });
  });

  it('calls next on error', async () => {
    mockService.listOrders.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await orderController.listOrders(authReq(), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('updateOrderStatus', () => {
  it('returns updated order', async () => {
    const updated = { ...BASE_ORDER, status: 'confirmed' as const };
    mockService.updateOrderStatus.mockResolvedValue(updated);
    const { res, json } = makeRes();
    const req = authReq({
      user: { id: 'supplier-001', role: 'supplier', isVerified: true, phone: '+254700000001' },
      params: { orderId: 'order-001' },
      body: { status: 'confirmed' },
    });
    await orderController.updateOrderStatus(req, res, next);
    expect(json).toHaveBeenCalledWith({ data: updated });
  });

  it('calls next on error', async () => {
    mockService.updateOrderStatus.mockRejectedValue(new Error('fail'));
    const { res } = makeRes();
    await orderController.updateOrderStatus(authReq({ params: { orderId: 'x' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});
