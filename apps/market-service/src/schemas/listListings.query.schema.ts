import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listListingsQuerySchema = z.object({
  crop: z.string().optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  quality_grade: z.enum(['A', 'B', 'C', 'reject']).optional(),
  available_from: z.string().date().optional(),
  available_until: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
