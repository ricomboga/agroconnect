import { z } from 'zod';

export const kycDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'more_info']),
  reason: z.string().min(1),
  documentRequested: z.string().optional(),
});

export type KycDecisionDto = z.infer<typeof kycDecisionSchema>;
