import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listFarmsQuerySchema = z.object({
  search: z.string().optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFarmsQuery = z.infer<typeof listFarmsQuerySchema>;
