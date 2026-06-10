import { z } from 'zod';

export const updateActivitySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  scheduledDate: z.string().date().optional(),
  completedDate: z.string().date().optional(),
  status: z.enum(['pending', 'completed', 'skipped']).optional(),
  labourCostKes: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateActivityDto = z.infer<typeof updateActivitySchema>;
