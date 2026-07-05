import { z } from 'zod';

export const listSubsidyApplicationsQuerySchema = z.object({
  programId: z.string().uuid().optional(),
  county: z.string().min(1).max(100).optional(),
  status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'disbursed']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListSubsidyApplicationsQuery = z.infer<typeof listSubsidyApplicationsQuerySchema>;
