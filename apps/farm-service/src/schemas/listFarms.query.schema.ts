import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listFarmsQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(200).optional(),
  county: z.string().max(100).optional(),
});

export type ListFarmsQuery = z.infer<typeof listFarmsQuerySchema>;
