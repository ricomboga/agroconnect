import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createRegistrationSchema = z.object({
  farmId: z.string().uuid(),
  farmName: z.string().min(1).max(200),
  county: z.enum(KENYA_COUNTIES),
  subCounty: z.string().max(100).optional(),
  areaAcres: z.number().positive(),
  landTitle: z.string().max(100).optional(),
});

export type CreateRegistrationDto = z.infer<typeof createRegistrationSchema>;
