import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listRegistrationsQuerySchema = z.object({
  county: z.enum(KENYA_COUNTIES).optional(),
  status: z.enum(['pending', 'submitted', 'under_review', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;
