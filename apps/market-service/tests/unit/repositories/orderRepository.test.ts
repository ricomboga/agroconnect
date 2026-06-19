const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@agroconnect/db/market', () => ({
  prisma: {
    order: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

import * as repo from '../../../src/repositories/orderRepository';

const BASE_ORDER = {
  id: 'order-001',
  buyerId: 'buyer-001',
  supplierId: 'supplier-001',
  status: 'pending',
};

beforeEach(() => jest.clearAllMocks());

describe('orderRepository.createOrder', () => {
  it('calls prisma.order.create with data', async () => {
    mockCreate.mockResolvedValue(BASE_ORDER);
    const data = {
      buyerId: 'buyer-001',
      supplierId: 'supplier-001',
      productId: 'prod-001',
      quantityUnits: 10,
      unitPriceKes: 3800,
      totalPriceKes: 38000,
      deliveryAddress: 'Nakuru',
    };
    const result = await repo.createOrder(data);
    expect(result).toEqual(BASE_ORDER);
    expect(mockCreate).toHaveBeenCalledWith({ data });
  });
});

describe('orderRepository.findOrders', () => {
  it('filters by buyerId for buyer role', async () => {
    mockFindMany.mockResolvedValue([BASE_ORDER]);
    await repo.findOrders('buyer-001', 'buyer', { page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ buyerId: 'buyer-001' }) }),
    );
  });

  it('filters by supplierId for supplier role', async () => {
    mockFindMany.mockResolvedValue([BASE_ORDER]);
    await repo.findOrders('supplier-001', 'supplier', { page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ supplierId: 'supplier-001' }) }),
    );
  });

  it('applies no user filter for admin role', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findOrders('admin-001', 'admin', { page: 1, page_size: 20 }, { take: 20, skip: 0 });
    const call = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where['buyerId']).toBeUndefined();
    expect(call.where['supplierId']).toBeUndefined();
  });

  it('applies status filter', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findOrders('buyer-001', 'buyer', { status: 'confirmed', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'confirmed' }) }),
    );
  });
});

describe('orderRepository.countOrders', () => {
  it('returns count from prisma', async () => {
    mockCount.mockResolvedValue(3);
    const result = await repo.countOrders('buyer-001', 'buyer', { page: 1, page_size: 20 });
    expect(result).toBe(3);
  });
});

describe('orderRepository.findOrderById', () => {
  it('returns order by id', async () => {
    mockFindUnique.mockResolvedValue(BASE_ORDER);
    const result = await repo.findOrderById('order-001');
    expect(result).toEqual(BASE_ORDER);
  });

  it('returns null when not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await repo.findOrderById('missing')).toBeNull();
  });
});

describe('orderRepository.updateOrderStatus', () => {
  it('updates status field', async () => {
    mockUpdate.mockResolvedValue({ ...BASE_ORDER, status: 'confirmed' });
    await repo.updateOrderStatus('order-001', 'confirmed');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'order-001' },
      data: { status: 'confirmed' },
    });
  });
});
