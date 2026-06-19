import { createOrderSchema } from '../../../src/schemas/createOrder.schema';

const VALID = {
  productId: '00000000-0000-0000-0000-000000000001',
  quantityUnits: 10,
  deliveryAddress: 'Nakuru Town, Market Road',
};

describe('createOrderSchema', () => {
  it('accepts a valid order', () => {
    expect(createOrderSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects invalid productId UUID', () => {
    expect(createOrderSchema.safeParse({ ...VALID, productId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects non-positive quantityUnits', () => {
    expect(createOrderSchema.safeParse({ ...VALID, quantityUnits: 0 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...VALID, quantityUnits: -5 }).success).toBe(false);
  });

  it('rejects missing deliveryAddress', () => {
    const { deliveryAddress: _, ...rest } = VALID;
    expect(createOrderSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts optional notes', () => {
    expect(createOrderSchema.safeParse({ ...VALID, notes: 'Call before delivery' }).success).toBe(true);
  });
});
