import { z } from 'zod';

export const bulkApproveApplicationsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  collectionPoint: z.string().optional(),
  collectionDate: z.string().optional(),
  approvedItem: z.string().optional(),
});

export type BulkApproveApplicationsDto = z.infer<typeof bulkApproveApplicationsSchema>;
