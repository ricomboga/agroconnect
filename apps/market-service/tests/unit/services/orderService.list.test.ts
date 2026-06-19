jest.mock('../../../src/repositories/orderRepository');
jest.mock('../../../src/repositories/productRepository');
jest.mock('../../../src/events/producers/orderPlacedProducer');
jest.mock('../../../src/events/producers/orderUpdatedProducer');

import * as orderRepo from '../../../src/repositories/orderRepository';
import * as productRepo from '../../../src/repositories/productRepository';
import { publishOrderPlaced } from '../../../src/events/producers/orderPlacedProducer';
import * as orderService from '../../../src/services/orderService';

const mockOrderRepo = orderRepo as jest.Mocked<typeof orderRepo>;
const mockProductRepo = productRepo as jest.Mocked<typeof productRepo>;
const mockPublishOrderPlaced = publishOrderPlaced as jest.MockedFunction<typeof publishOrderPlaced>;

const SUPPLIER_ID = 'supplier-001';

const BASE_PRODUCT = {
  id: 'prod-001',
  supplierId: SUPPLIER_ID,
  isActive: true,
  stockQuantity: '100',
  pricePerUnitKes: '3800',
  unit: 'bag',
  name: 'Urea',
  category: 'fertiliser' as const,
  brand: null,
  description: 'Test',
  sku: null,
  countyAvailability: ['Nakuru'],
  photos: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BASE_ORDER = {
  id: 'order-001',
  buyerId: 'buyer-001',
  supplierId: SUPPLIER_ID,
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

describe('orderService.placeOrder — success path', () => {
  it('creates order with snapshotted price and publishes event', async () => {
    mockProductRepo.findProductById.mockResolvedValue(BASE_PRODUCT);
    mockOrderRepo.createOrder.mockResolvedValue(BASE_ORDER);
    mockPublishOrderPlaced.mockResolvedValue(undefined);

    const result = await orderService.placeOrder('buyer-001', {
      productId: 'prod-001',
      quantityUnits: 10,
      deliveryAddress: 'Nakuru',
    });

    expect(result).toEqual(BASE_ORDER);
    expect(mockOrderRepo.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerId: 'buyer-001',
        supplierId: SUPPLIER_ID,
        unitPriceKes: 3800,
        totalPriceKes: 38000,
      }),
    );
    expect(mockPublishOrderPlaced).toHaveBeenCalledWith('order-001', 'buyer-001', SUPPLIER_ID, 38000);
  });
});

describe('orderService.listOrders', () => {
  it('returns paginated orders with meta', async () => {
    mockOrderRepo.findOrders.mockResolvedValue([BASE_ORDER]);
    mockOrderRepo.countOrders.mockResolvedValue(1);
    const result = await orderService.listOrders('buyer-001', 'buyer', { page: 1, page_size: 20 });
    expect(result.orders).toHaveLength(1);
    expect(result.meta).toMatchObject({ page: 1, total: 1 });
  });
});
