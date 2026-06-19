import { z } from 'zod';

export const createRegistrationSchema = z.object({
  farmId: z.string().uuid(),
  farmName: z.string().min(1).max(200),
  county: z.string().min(1).max(100),
  subCounty: z.string().max(100).optional(),
  areaAcres: z.number().positive(),
  landTitle: z.string().max(100).optional(),
});

export type CreateRegistrationDto = z.infer<typeof createRegistrationSchema>;
