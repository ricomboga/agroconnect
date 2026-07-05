import { z } from 'zod';

export const assignLenderSchema = z.object({
  lenderId: z.string().min(1),
});

export type AssignLenderDto = z.infer<typeof assignLenderSchema>;
