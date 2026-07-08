import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

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
  county: z.enum(KENYA_COUNTIES).optional(),
  sort: z.enum(['newest', 'top']).default('newest'),
});

export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;
