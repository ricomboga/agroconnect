import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createSystemUserSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(['admin', 'govt_officer']),
  staffRole: z.enum(['admin', 'county_admin', 'moderator']),
  isSuperAdmin: z.boolean().optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  language: z.enum(['sw', 'en']).optional(),
  roleIds: z.array(z.string()).optional(),
});

export type CreateSystemUserDto = z.infer<typeof createSystemUserSchema>;
