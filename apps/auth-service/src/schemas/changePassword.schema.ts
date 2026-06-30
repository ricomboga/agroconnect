import { z } from 'zod';

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(4).max(128),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
