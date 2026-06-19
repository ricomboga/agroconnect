import { z } from 'zod';

export const signUrlQuerySchema = z.object({
  expires: z.coerce.number().int().min(1).max(86400).default(3600),
});

export type SignUrlQueryDto = z.infer<typeof signUrlQuerySchema>;
