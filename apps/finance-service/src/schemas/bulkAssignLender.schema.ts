import { z } from 'zod';

const bulkAssignRowSchema = z.object({
  identifier: z.string().min(1), // farmer phone number or National ID
  lenderName: z.string().min(1), // NGO/Group/lender name, resolved server-side (case-insensitive)
});

export const bulkAssignLenderSchema = z.object({
  rows: z.array(bulkAssignRowSchema).min(1).max(500),
});

export type BulkAssignRow = z.infer<typeof bulkAssignRowSchema>;
export type BulkAssignLenderDto = z.infer<typeof bulkAssignLenderSchema>;
