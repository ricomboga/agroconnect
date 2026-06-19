import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  role: z
    .enum(['farmer', 'extension_officer', 'vet_officer', 'supplier', 'buyer', 'govt_officer', 'admin'])
    .optional(),
  county: z.string().optional(),
  kyc_status: z.enum(['pending', 'submitted', 'verified', 'rejected']).optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
