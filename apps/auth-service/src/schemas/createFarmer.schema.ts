import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createFarmerSchema = z.object({
  phone: z
    .string()
    .regex(/^\+2547\d{8}$|^\+2541\d{8}$/, 'error.phone.invalid'),
  password: z.string().min(8, 'error.password.too_short'),
  fullName: z.string().min(2, 'error.full_name.too_short').max(100),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  language: z.enum(['sw', 'en']).default('sw'),
});

export type CreateFarmerDto = z.infer<typeof createFarmerSchema>;
