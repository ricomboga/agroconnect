import { z } from 'zod';

export const scheduleQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'skipped']).optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  plotId: z.string().uuid().optional(),
});

export type ScheduleQueryDto = z.infer<typeof scheduleQuerySchema>;
