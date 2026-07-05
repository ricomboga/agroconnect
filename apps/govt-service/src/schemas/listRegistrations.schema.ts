import { z } from 'zod';

export const listRegistrationsQuerySchema = z.object({
  county: z.string().min(1).max(100).optional(),
  status: z.enum(['pending', 'submitted', 'under_review', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;
