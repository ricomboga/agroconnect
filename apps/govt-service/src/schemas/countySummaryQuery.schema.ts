import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const countySummaryQuerySchema = z.object({
  county: z.enum(KENYA_COUNTIES).optional(),
});

export type CountySummaryQuery = z.infer<typeof countySummaryQuerySchema>;
