import { z } from 'zod';

export const listFarmsQuerySchema = z.object({
  search: z.string().optional(),
  county: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFarmsQuery = z.infer<typeof listFarmsQuerySchema>;
