import { z } from 'zod';

export const bulkApproveApplicationsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  decision: z.literal('approved'),
  collectionPoint: z.string().optional(),
  collectionDate: z.coerce.date().optional(),
  approvedItem: z.string().optional(),
});

export type BulkApproveApplicationsDto = z.infer<typeof bulkApproveApplicationsSchema>;
