import { z } from 'zod';

export const updateListingSchema = z.object({
  crop: z.string().min(1).max(100).optional(),
  variety: z.string().max(100).optional(),
  quantityKg: z.number().positive().optional(),
  askingPriceKes: z.number().positive().optional(),
  qualityGrade: z.enum(['A', 'B', 'C', 'reject']).optional(),
  availableFrom: z.string().date().optional(),
  availableUntil: z.string().date().optional(),
  locationCounty: z.string().min(1).max(100).optional(),
  locationDescription: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateListingDto = z.infer<typeof updateListingSchema>;
