import { z } from 'zod';

export const addWorkerSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['manager', 'field_worker', 'harvester', 'sprayer', 'driver']),
});

export type AddWorkerDto = z.infer<typeof addWorkerSchema>;
