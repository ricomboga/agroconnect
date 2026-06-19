import { z } from 'zod';

export const createReplySchema = z.object({
  body: z.string().min(5).max(5000),
});

export type CreateReplyDto = z.infer<typeof createReplySchema>;
