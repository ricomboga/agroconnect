import { z } from 'zod';

export const createInquirySchema = z.object({
  message: z.string().min(1).max(500),
});

export type CreateInquiryDto = z.infer<typeof createInquirySchema>;
