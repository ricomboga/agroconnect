import { z } from 'zod';

export const updateLicenseStatusSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'expired']),
  notes: z.string().max(1000).optional(),
});

export type UpdateLicenseStatusDto = z.infer<typeof updateLicenseStatusSchema>;
