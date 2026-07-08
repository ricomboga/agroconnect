import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createListingSchema = z.object({
  farmId: z.string().uuid(),
  harvestId: z.string().uuid().optional(),
  crop: z.string().min(1).max(100),
  variety: z.string().max(100).optional(),
  quantityKg: z.number().positive(),
  askingPriceKes: z.number().positive(),
  qualityGrade: z.enum(['A', 'B', 'C', 'reject']),
  availableFrom: z.string().date(),
  availableUntil: z.string().date(),
  locationCounty: z.enum(KENYA_COUNTIES),
  locationDescription: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateListingDto = z.infer<typeof createListingSchema>;
