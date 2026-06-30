import { z } from 'zod';

export const updateWorkerRoleSchema = z.object({
  role: z.enum(['manager', 'field_worker', 'harvester', 'sprayer', 'driver']),
});

export type UpdateWorkerRoleDto = z.infer<typeof updateWorkerRoleSchema>;
