import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createSupplierProfileSchema = z.object({
  userId: z.string().uuid(),
  businessName: z.string().min(2).max(200),
  businessRegNumber: z.string().max(80).optional(),
  deliveryRadiusKm: z.string().max(80).optional(),
  description: z.string().max(1000).optional(),
  county: z.enum(KENYA_COUNTIES),
  subCounty: z.string().max(100).optional(),
  categories: z.array(z.string().max(80)).default([]),
  phone: z.string().min(9).max(20),
  address: z.string().max(300).optional(),
});

export type CreateSupplierProfileDto = z.infer<typeof createSupplierProfileSchema>;
