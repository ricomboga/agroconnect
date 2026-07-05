const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockGroupBy = jest.fn();

jest.mock('@agroconnect/db/market', () => ({
  prisma: {
    order: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      update: mockUpdate,
      groupBy: mockGroupBy,
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

describe('orderRepository.countDistinctCustomersForSupplier', () => {
  it('counts distinct buyers scoped to the supplier, bounded by a scan cap', async () => {
    mockFindMany.mockResolvedValue([{ buyerId: 'buyer-001' }, { buyerId: 'buyer-002' }]);
    const result = await repo.countDistinctCustomersForSupplier('supplier-001');
    expect(result).toBe(2);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { supplierId: 'supplier-001' },
        distinct: ['buyerId'],
        take: 5000,
      }),
    );
  });
});

describe('orderRepository.groupCustomersBySupplier', () => {
  it('groups orders by buyer and maps aggregate fields', async () => {
    mockGroupBy.mockResolvedValue([
      {
        buyerId: 'buyer-001',
        _count: { _all: 3 },
        _sum: { totalPriceKes: '11400' },
        _max: { createdAt: new Date('2026-06-01') },
      },
    ]);

    const result = await repo.groupCustomersBySupplier('supplier-001', { take: 20, skip: 0 });

    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['buyerId'],
        where: { supplierId: 'supplier-001' },
        take: 20,
        skip: 0,
      }),
    );
    expect(result).toEqual([
      {
        buyerId: 'buyer-001',
        orderCount: 3,
        totalSpentKes: 11400,
        lastOrderAt: new Date('2026-06-01'),
      },
    ]);
  });

  it('defaults totalSpentKes to 0 when the sum is null', async () => {
    mockGroupBy.mockResolvedValue([
      {
        buyerId: 'buyer-002',
        _count: { _all: 0 },
        _sum: { totalPriceKes: null },
        _max: { createdAt: new Date('2026-06-01') },
      },
    ]);

    const result = await repo.groupCustomersBySupplier('supplier-001', { take: 20, skip: 0 });
    expect(result[0]?.totalSpentKes).toBe(0);
  });
});
