import { z } from 'zod';

export const lenderStatusUpdateSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected']),
  approved_amount_kes: z.number().positive().optional(),
  interest_rate_pct: z.number().positive().optional(),
  rejection_reason: z.string().max(500).optional(),
});

export type LenderStatusUpdateDto = z.infer<typeof lenderStatusUpdateSchema>;
