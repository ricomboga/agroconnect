import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listInputsQuerySchema = paginationQuerySchema.extend({
  type: z
    .enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other'])
    .optional(),
  season: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .optional()
    .describe('4-digit year; coerced to Jan 1 – Dec 31 date range in the service layer'),
});

export type ListInputsQuery = z.infer<typeof listInputsQuerySchema>;
