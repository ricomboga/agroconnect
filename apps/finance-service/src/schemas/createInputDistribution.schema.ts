import { z } from 'zod';

export const createInputDistributionSchema = z.object({
  farmerId: z.string().min(1),
  inputType: z.string().min(1).max(100),
  valueKes: z.number().positive(),
  distributedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'distributedAt must be YYYY-MM-DD'),
});

export type CreateInputDistributionDto = z.infer<typeof createInputDistributionSchema>;
