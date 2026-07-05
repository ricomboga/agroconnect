import { z } from 'zod';

export const resetPasswordSchema = z.object({
  phone: z.string().regex(/^\+2547\d{8}$|^\+2541\d{8}$/, 'error.phone.format'),
  code: z.string().length(6).regex(/^\d{6}$/, 'error.otp.format'),
  new_password: z.string().min(4).max(128),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
