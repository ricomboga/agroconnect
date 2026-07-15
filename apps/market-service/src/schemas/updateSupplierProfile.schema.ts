import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

// businessName / businessRegNumber are intentionally excluded — those are
// admin-owned at onboarding time, not supplier-editable.
export const updateSupplierProfileSchema = z.object({
  description: z.string().max(1000).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  phone: z.string().min(9).max(20).optional(),
  address: z.string().max(300).optional(),
  deliveryRadiusKm: z.string().max(80).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateSupplierProfileDto = z.infer<typeof updateSupplierProfileSchema>;
