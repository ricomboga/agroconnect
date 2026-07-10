import { z } from 'zod';

export const updateOfficerProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(9).max(20).optional(),
  ministry: z.enum(['moa_hq', 'county_agri', 'kalro', 'kephis', 'ncpb', 'afa']).optional(),
  position: z.string().min(2).max(100).optional(),
  staffId: z.string().min(1).max(50).optional(),
  assignedCounty: z.string().min(2).max(80).optional(),
  assignedSubCounty: z.string().max(80).optional(),
});

export type UpdateOfficerProfileDto = z.infer<typeof updateOfficerProfileSchema>;
