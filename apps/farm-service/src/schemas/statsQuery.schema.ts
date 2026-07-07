import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const livestockStatsQuerySchema = z.object({
  county: z.enum(KENYA_COUNTIES).optional(),
  animalType: z.string().min(1).optional(),
});

export type LivestockStatsQuery = z.infer<typeof livestockStatsQuerySchema>;
