import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createUserSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum([
    'farmer',
    'extension_officer',
    'vet_officer',
    'supplier',
    'buyer',
    'govt_officer',
    'admin',
    'lender',
    'farm_worker',
  ]),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  language: z.enum(['sw', 'en']).optional(),
  isSuperAdmin: z.boolean().optional(),
  staffRole: z.enum(['admin', 'county_admin', 'moderator']).optional(),
  partnerBankId: z.string().optional(),
  supervisorId: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
