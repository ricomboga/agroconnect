import { z } from 'zod';

export const countySummaryQuerySchema = z.object({
  county: z.string().min(1).max(100).optional(),
});

export type CountySummaryQuery = z.infer<typeof countySummaryQuerySchema>;
