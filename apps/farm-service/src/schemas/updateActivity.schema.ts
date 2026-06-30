import { z } from 'zod';

export const updateActivitySchema = z
  .object({
    type: z.enum(['planting', 'irrigation', 'fertilising', 'pesticide', 'harvesting', 'weeding', 'other']).optional(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(2000).optional(),
    scheduledDate: z.string().date().optional(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    completedDate: z.string().date().optional(),
    status: z.enum(['pending', 'completed', 'skipped']).optional(),
    plotId: z.string().uuid().nullable().optional(),
    labourCostKes: z.number().min(0).optional(),
    assignedToWorkerId: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).optional(),
    skipReason: z.string().max(500).optional(),
  })
  .refine(
    (data) => data.status !== 'completed' || !!data.completedDate,
    { message: 'completedDate is required when status is completed', path: ['completedDate'] },
  );

export type UpdateActivityDto = z.infer<typeof updateActivitySchema>;
