import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listSubsidyApplicationsQuerySchema = z.object({
  programId: z.string().uuid().optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'disbursed']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListSubsidyApplicationsQuery = z.infer<typeof listSubsidyApplicationsQuerySchema>;
