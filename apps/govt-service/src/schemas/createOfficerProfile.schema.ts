import { z } from 'zod';

export const createOfficerProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(9).max(20),
  ministry: z.enum(['moa_hq', 'county_agri', 'kalro', 'kephis', 'ncpb', 'afa']),
  position: z.string().min(2).max(100),
  staffId: z.string().min(1).max(50),
  assignedCounty: z.string().min(2).max(80),
  assignedSubCounty: z.string().max(80).optional(),
});

export type CreateOfficerProfileDto = z.infer<typeof createOfficerProfileSchema>;
