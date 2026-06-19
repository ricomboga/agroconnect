import { z } from 'zod';

export const listOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'dispatched', 'delivered']).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
