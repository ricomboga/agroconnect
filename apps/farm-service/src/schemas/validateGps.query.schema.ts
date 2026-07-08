import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const validateGpsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  county: z.enum(KENYA_COUNTIES),
});

export type ValidateGpsQuery = z.infer<typeof validateGpsQuerySchema>;
