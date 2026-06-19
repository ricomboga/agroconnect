import { z } from 'zod';

export const ussdRequestSchema = z.object({
  sessionId: z.string().min(1),
  serviceCode: z.string().min(1),
  phoneNumber: z.string().min(1),
  networkCode: z.string().default(''),
  text: z.string().default(''),
});

export type UssdRequest = z.infer<typeof ussdRequestSchema>;
