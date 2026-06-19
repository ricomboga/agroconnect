import { z } from 'zod';

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected']),
  notes: z.string().max(1000).optional(),
});

export type UpdateRegistrationStatusDto = z.infer<typeof updateRegistrationStatusSchema>;
