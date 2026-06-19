jest.mock('../../../src/repositories/orderRepository');
jest.mock('../../../src/repositories/productRepository');
jest.mock('../../../src/events/producers/orderPlacedProducer');
jest.mock('../../../src/events/producers/orderUpdatedProducer');

import * as orderRepo from '../../../src/repositories/orderRepository';
import * as productRepo from '../../../src/repositories/productRepository';
import * as orderService from '../../../src/services/orderService';

const mockOrderRepo = orderRepo as jest.Mocked<typeof orderRepo>;
const mockProductRepo = productRepo as jest.Mocked<typeof productRepo>;

const SUPPLIER_ID = 'supplier-001';
const OTHER_SUPPLIER_ID = 'supplier-002';

const ORDER_PENDING = {
  id: 'order-001',
  buyerId: 'buyer-001',
  supplierId: SUPPLIER_ID,
  productId: 'prod-001',
  quantityUnits: '1',
  unitPriceKes: '3800',
  totalPriceKes: '3800',
  deliveryAddress: 'Nakuru',
  notes: null,
  status: 'pending' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('orderService.updateOrderStatus — transition guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 422 when skipping a step (pending → dispatched)', async () => {
    mockOrderRepo.findOrderById.mockResolvedValue(ORDER_PENDING);
    await expect(
      orderService.updateOrderStatus('order-001', SUPPLIER_ID, 'supplier', { status: 'dispatched' }),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'INVALID_STATUS_TRANSITION' });
  });

  it('throws 422 when going backwards (dispatched → confirmed)', async () => {
    mockOrderRepo.findOrderById.mockResolvedValue({ ...ORDER_PENDING, status: 'dispatched' as const });
    await expect(
      orderService.updateOrderStatus('order-001', SUPPLIER_ID, 'supplier', { status: 'confirmed' }),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'INVALID_STATUS_TRANSITION' });
  });

  it('throws 403 when supplierId does not match', async () => {
    mockOrderRepo.findOrderById.mockResolvedValue(ORDER_PENDING);
    await expect(
      orderService.updateOrderStatus('order-001', OTHER_SUPPLIER_ID, 'supplier', { status: 'confirmed' }),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('throws 403 when caller role is farmer (not supplier)', async () => {
    await expect(
      orderService.updateOrderStatus('order-001', 'farmer-001', 'farmer', { status: 'confirmed' }),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('throws 403 when caller role is buyer', async () => {
    await expect(
      orderService.updateOrderStatus('order-001', 'buyer-001', 'buyer', { status: 'confirmed' }),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('throws 404 when order does not exist', async () => {
    mockOrderRepo.findOrderById.mockResolvedValue(null);
    await expect(
      orderService.updateOrderStatus('missing', SUPPLIER_ID, 'supplier', { status: 'confirmed' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'ORDER_NOT_FOUND' });
  });
});

describe('orderService.placeOrder — stock guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 422 when stock is insufficient', async () => {
    mockProductRepo.findProductById.mockResolvedValue({
      id: 'prod-001',
      supplierId: SUPPLIER_ID,
      isActive: true,
      stockQuantity: '5',
      pricePerUnitKes: '3800',
      unit: 'bag',
      name: 'Urea',
      category: 'fertiliser',
      brand: null,
      description: 'Test',
      sku: null,
      countyAvailability: ['Nakuru'],
      photos: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      orderService.placeOrder('buyer-001', {
        productId: 'prod-001',
        quantityUnits: 10,
        deliveryAddress: 'Nakuru',
      }),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'INSUFFICIENT_STOCK' });
  });

  it('throws 422 when product is inactive', async () => {
    mockProductRepo.findProductById.mockResolvedValue({
      id: 'prod-001',
      supplierId: SUPPLIER_ID,
      isActive: false,
      stockQuantity: '100',
      pricePerUnitKes: '3800',
      unit: 'bag',
      name: 'Urea',
      category: 'fertiliser',
      brand: null,
      description: 'Test',
      sku: null,
      countyAvailability: ['Nakuru'],
      photos: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      orderService.placeOrder('buyer-001', {
        productId: 'prod-001',
        quantityUnits: 1,
        deliveryAddress: 'Nakuru',
      }),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'PRODUCT_UNAVAILABLE' });
  });

  it('throws 404 when product does not exist', async () => {
    mockProductRepo.findProductById.mockResolvedValue(null);
    await expect(
      orderService.placeOrder('buyer-001', {
        productId: '00000000-0000-0000-0000-000000000099',
        quantityUnits: 1,
        deliveryAddress: 'Nakuru',
      }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'PRODUCT_NOT_FOUND' });
  });
});
