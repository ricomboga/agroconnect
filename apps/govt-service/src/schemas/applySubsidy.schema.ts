import { z } from 'zod';

export const applySubsidySchema = z.object({
  farmId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});

export type ApplySubsidyDto = z.infer<typeof applySubsidySchema>;
