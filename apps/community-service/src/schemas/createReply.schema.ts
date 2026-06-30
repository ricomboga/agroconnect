import { z } from 'zod';

export const createReplySchema = z.object({
  authorName: z.string().min(1).max(100),
  authorRole: z.string().max(100).optional(),
  body: z.string().min(5).max(5000),
});

export type CreateReplyDto = z.infer<typeof createReplySchema>;
