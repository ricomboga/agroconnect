import { z } from 'zod';

export const createThreadSchema = z.object({
  authorName: z.string().min(1).max(100),
  authorCounty: z.string().max(100).optional(),
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
  title: z.string().min(3).max(300),
  body: z.string().min(10),
  cropType: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
