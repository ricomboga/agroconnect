import { z } from 'zod';

export const validateGpsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  county: z.string().min(1).max(100),
});

export type ValidateGpsQuery = z.infer<typeof validateGpsQuerySchema>;
