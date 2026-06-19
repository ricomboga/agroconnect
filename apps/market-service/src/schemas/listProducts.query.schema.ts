import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  category: z.enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'equipment', 'veterinary', 'other']).optional(),
  county: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
