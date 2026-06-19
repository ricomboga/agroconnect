import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listActivitiesQuerySchema = paginationQuerySchema.extend({
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  status: z.enum(['pending', 'completed', 'skipped']).optional(),
});

export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
