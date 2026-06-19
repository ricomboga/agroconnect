import { z } from 'zod';

export const farmSummaryQuerySchema = z.object({
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
});

export type FarmSummaryQuery = z.infer<typeof farmSummaryQuerySchema>;
