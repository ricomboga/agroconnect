import { updateOrderStatusSchema } from '../../../src/schemas/updateOrderStatus.schema';

describe('updateOrderStatusSchema', () => {
  it('accepts confirmed', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'confirmed' }).success).toBe(true);
  });

  it('accepts dispatched', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'dispatched' }).success).toBe(true);
  });

  it('accepts delivered', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'delivered' }).success).toBe(true);
  });

  it('rejects pending (not a supplier-settable status)', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });

  it('rejects arbitrary string', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'cancelled' }).success).toBe(false);
  });

  it('rejects missing status', () => {
    expect(updateOrderStatusSchema.safeParse({}).success).toBe(false);
  });
});
