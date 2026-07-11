import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  status: z.enum(['pending_verification', 'verified', 'active', 'inactive', 'disabled', 'deleted']),
});

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
