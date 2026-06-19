import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
