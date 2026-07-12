import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listProductsQuerySchema = z.object({
  category: z.enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'equipment', 'veterinary', 'other']).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
