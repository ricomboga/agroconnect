import { z } from 'zod';

export const createArticleSchema = z
  .object({
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
    type: z.enum(['news', 'event', 'webinar']).default('news'),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    joinLink: z.string().url().max(500).optional(),
    location: z.string().max(300).optional(),
    authorName: z.string().min(2).max(100),
    isPublished: z.boolean().default(true),
  })
  .refine((data) => data.type === 'news' || !!data.startsAt, {
    message: 'startsAt is required for events and webinars',
    path: ['startsAt'],
  });

export type CreateArticleDto = z.infer<typeof createArticleSchema>;
