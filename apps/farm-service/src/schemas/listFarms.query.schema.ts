import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listFarmsQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(200).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
});

export type ListFarmsQuery = z.infer<typeof listFarmsQuerySchema>;
