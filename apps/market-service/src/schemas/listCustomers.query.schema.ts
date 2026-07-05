import { z } from 'zod';

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
