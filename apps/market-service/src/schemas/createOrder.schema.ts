import { z } from 'zod';

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantityUnits: z.number().positive(),
  deliveryAddress: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
