import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const registerSchema = z.object({
  phone: z
    .string()
    .regex(/^\+2547\d{8}$|^\+2541\d{8}$/, 'error.phone.invalid'),
  email: z.string().email('error.email.invalid').optional(),
  password: z.string().min(8, 'error.password.too_short'),
  fullName: z.string().min(2, 'error.full_name.too_short').max(100),
  role: z.enum([
    'farmer',
    'extension_officer',
    'vet_officer',
    'supplier',
    'buyer',
    'govt_officer',
  ]),
  county: z.enum(KENYA_COUNTIES).optional(),
  language: z.enum(['sw', 'en']).default('sw'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
