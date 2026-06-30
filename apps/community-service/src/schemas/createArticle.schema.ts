import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(5).max(200),
  summary: z.string().min(10).max(500),
  body: z.string().min(50),
  category: z.enum([
    'crop_advice',
    'livestock_health',
    'market_talk',
    'weather_climate',
    'finance_business',
    'government_programs',
    'success_stories',
    'equipment_tools',
  ]),
  authorName: z.string().min(2).max(100),
  isPublished: z.boolean().default(true),
});

export type CreateArticleDto = z.infer<typeof createArticleSchema>;
