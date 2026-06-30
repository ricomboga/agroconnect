import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listArticlesQuerySchema = paginationQuerySchema.extend({
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
});

export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
