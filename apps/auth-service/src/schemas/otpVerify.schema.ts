import { z } from 'zod';

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+2547\d{8}$|^\+2541\d{8}$/, 'error.phone.format'),
  code:  z.string().length(6).regex(/^\d{6}$/, 'error.otp.format'),
});

export type OtpVerifyDto = z.infer<typeof otpVerifySchema>;
