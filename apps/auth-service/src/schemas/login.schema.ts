import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(1, 'error.phone.required'),
  password: z.string().min(1, 'error.password.required'),
  deviceId: z.string().optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
