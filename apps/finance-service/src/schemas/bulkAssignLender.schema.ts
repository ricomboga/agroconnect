import { z } from 'zod';

export const bulkAssignLenderSchema = z.object({
  lenderId: z.string().min(1),
  identifiers: z.array(z.string().min(1)).min(1).max(500),
});

export type BulkAssignLenderDto = z.infer<typeof bulkAssignLenderSchema>;
