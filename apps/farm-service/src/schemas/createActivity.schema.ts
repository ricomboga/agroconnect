import { z } from 'zod';

export const createActivitySchema = z.object({
  plotId: z.string().uuid().optional(),
  type: z.enum(['planting', 'irrigation', 'fertilising', 'pesticide', 'harvesting', 'weeding', 'other']),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  scheduledDate: z.string().date(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  labourCostKes: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  assignedToWorkerId: z.string().uuid().optional(),
});

export type CreateActivityDto = z.infer<typeof createActivitySchema>;
