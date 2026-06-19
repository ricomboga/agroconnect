import { z } from 'zod';

export const updateModerationSchema = z.object({
  status: z.enum(['active', 'deleted']),
});

export type UpdateModerationDto = z.infer<typeof updateModerationSchema>;
