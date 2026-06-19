import { z } from 'zod';

export const updateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'dispatched', 'delivered']),
});

export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
