import { z } from 'zod';

export const createLicenseSchema = z.object({
  farmId: z.string().uuid(),
  licenseType: z.enum(['pesticide_use', 'agro_dealer', 'export_permit', 'water_abstraction']),
  description: z.string().max(1000).optional(),
});

export type CreateLicenseDto = z.infer<typeof createLicenseSchema>;
