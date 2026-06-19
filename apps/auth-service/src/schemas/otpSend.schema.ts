import { z } from 'zod';

export const otpSendSchema = z.object({
  phone: z.string().regex(/^\+2547\d{8}$|^\+2541\d{8}$/, 'error.phone.format'),
});

export type OtpSendDto = z.infer<typeof otpSendSchema>;
