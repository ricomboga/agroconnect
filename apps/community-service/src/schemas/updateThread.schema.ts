import { z } from 'zod';

export const updateThreadSchema = z
  .object({
    title: z.string().min(3).max(300).optional(),
    body: z.string().min(10).optional(),
    cropType: z.string().max(100).optional(),
    county: z.string().max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateThreadDto = z.infer<typeof updateThreadSchema>;
