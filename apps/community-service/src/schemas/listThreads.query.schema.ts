import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listThreadsQuerySchema = paginationQuerySchema.extend({
  category: z
    .enum([
      'crop_advice',
      'livestock_health',
      'market_talk',
      'weather_climate',
      'finance_business',
      'government_programs',
      'success_stories',
      'equipment_tools',
    ])
    .optional(),
  cropType: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  sort: z.enum(['newest', 'top']).default('newest'),
});

export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;
