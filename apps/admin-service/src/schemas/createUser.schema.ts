import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createUserSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.literal('admin'),
  county: z.enum(KENYA_COUNTIES).optional(),
  language: z.enum(['sw', 'en']).optional(),
  isSuperAdmin: z.boolean().optional(),
  staffRole: z.enum(['admin', 'county_admin', 'moderator']).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
