jest.mock('../../../src/repositories/orderRepository');
jest.mock('../../../src/repositories/productRepository');
jest.mock('../../../src/events/producers/orderPlacedProducer');
jest.mock('../../../src/events/producers/orderUpdatedProducer');

import * as orderRepo from '../../../src/repositories/orderRepository';
import * as productRepo from '../../../src/repositories/productRepository';
import * as orderService from '../../../src/services/orderService';
import * as productService from '../../../src/services/productService';

const mockOrderRepo = orderRepo as jest.Mocked<typeof orderRepo>;
const mockProductRepo = productRepo as jest.Mocked<typeof productRepo>;

const SUPPLIER_ID = 'supplier-001';

beforeEach(() => jest.clearAllMocks());

describe('orderService.listSupplierOrders', () => {
  it('forces role to supplier and scopes by the caller id', async () => {
    mockOrderRepo.findOrders.mockResolvedValue([]);
    mockOrderRepo.countOrders.mockResolvedValue(0);

    await orderService.listSupplierOrders(SUPPLIER_ID, { page: 1, page_size: 20 });

    expect(mockOrderRepo.findOrders).toHaveBeenCalledWith(
      SUPPLIER_ID,
      'supplier',
      { page: 1, page_size: 20 },
      { take: 20, skip: 0 },
    );
    expect(mockOrderRepo.countOrders).toHaveBeenCalledWith(SUPPLIER_ID, 'supplier', { page: 1, page_size: 20 });
  });

  it('returns paginated orders with meta', async () => {
    const order = { id: 'order-001', supplierId: SUPPLIER_ID };
    mockOrderRepo.findOrders.mockResolvedValue([order]);
    mockOrderRepo.countOrders.mockResolvedValue(1);

    const result = await orderService.listSupplierOrders(SUPPLIER_ID, { page: 1, page_size: 20 });

    expect(result.orders).toEqual([order]);
    expect(result.meta).toMatchObject({ page: 1, total: 1 });
  });
});

describe('orderService.getSupplierCustomers', () => {
  it('aggregates per-customer order count, total spent, and last order date', async () => {
    const aggregate = {
      buyerId: 'buyer-001',
      orderCount: 3,
      totalSpentKes: 11400,
      lastOrderAt: new Date('2026-06-01'),
    };
    mockOrderRepo.groupCustomersBySupplier.mockResolvedValue([aggregate]);
    mockOrderRepo.countDistinctCustomersForSupplier.mockResolvedValue(1);

    const result = await orderService.getSupplierCustomers(SUPPLIER_ID, { page: 1, page_size: 20 });

    expect(mockOrderRepo.groupCustomersBySupplier).toHaveBeenCalledWith(SUPPLIER_ID, { take: 20, skip: 0 });
    expect(result.customers).toEqual([aggregate]);
    expect(result.meta).toMatchObject({ page: 1, total: 1 });
  });

  it('returns an empty page when the supplier has no orders', async () => {
    mockOrderRepo.groupCustomersBySupplier.mockResolvedValue([]);
    mockOrderRepo.countDistinctCustomersForSupplier.mockResolvedValue(0);

    const result = await orderService.getSupplierCustomers(SUPPLIER_ID, { page: 1, page_size: 20 });

    expect(result.customers).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});

describe('productService.getSupplierSummary', () => {
  it('returns active count, low-stock count, bounded low-stock items, and revenue aggregates', async () => {
    const lowStockItem = { id: 'prod-001', supplierId: SUPPLIER_ID, stockQuantity: '2', isActive: true };
    mockProductRepo.countActiveProductsBySupplier.mockResolvedValue(5);
    mockProductRepo.countLowStockProductsBySupplier.mockResolvedValue(1);
    mockProductRepo.findLowStockProductsBySupplier.mockResolvedValue([lowStockItem]);
    mockOrderRepo.getSupplierRevenueSummary.mockResolvedValue({
      revenueMonthKes: 5000,
      revenueTrend: [{ month: 'Jun', totalKes: 5000 }],
      topProducts: [{ productId: 'prod-001', unitsSold: 3, totalKes: 5000 }],
    });
    mockProductRepo.findProductsByIds.mockResolvedValue([{ id: 'prod-001', name: 'CAN Fertiliser' }]);

    const result = await productService.getSupplierSummary(SUPPLIER_ID, { low_stock_threshold: 10 });

    expect(mockProductRepo.countActiveProductsBySupplier).toHaveBeenCalledWith(SUPPLIER_ID);
    expect(mockProductRepo.countLowStockProductsBySupplier).toHaveBeenCalledWith(SUPPLIER_ID, 10);
    expect(mockProductRepo.findLowStockProductsBySupplier).toHaveBeenCalledWith(SUPPLIER_ID, 10, 50);
    expect(mockOrderRepo.getSupplierRevenueSummary).toHaveBeenCalledWith(SUPPLIER_ID);
    expect(result).toEqual({
      activeProductCount: 5,
      lowStockCount: 1,
      lowStockItems: [lowStockItem],
      revenueMonthKes: 5000,
      revenueTrend: [{ month: 'Jun', totalKes: 5000 }],
      topProducts: [{ productId: 'prod-001', unitsSold: 3, totalKes: 5000, name: 'CAN Fertiliser' }],
    });
  });

  it('falls back to "Unknown product" when a top product has since been deleted', async () => {
    mockProductRepo.countActiveProductsBySupplier.mockResolvedValue(0);
    mockProductRepo.countLowStockProductsBySupplier.mockResolvedValue(0);
    mockProductRepo.findLowStockProductsBySupplier.mockResolvedValue([]);
    mockOrderRepo.getSupplierRevenueSummary.mockResolvedValue({
      revenueMonthKes: 0,
      revenueTrend: [],
      topProducts: [{ productId: 'deleted-prod', unitsSold: 1, totalKes: 100 }],
    });
    mockProductRepo.findProductsByIds.mockResolvedValue([]);

    const result = await productService.getSupplierSummary(SUPPLIER_ID, { low_stock_threshold: 10 });

    expect(result.topProducts).toEqual([
      { productId: 'deleted-prod', unitsSold: 1, totalKes: 100, name: 'Unknown product' },
    ]);
  });
});
