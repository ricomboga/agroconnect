import { z } from 'zod';

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'equipment', 'veterinary', 'other']).optional(),
  brand: z.string().max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  unit: z.string().min(1).max(50).optional(),
  pricePerUnitKes: z.number().positive().optional(),
  stockQuantity: z.number().nonnegative().optional(),
  countyAvailability: z.array(z.string()).min(1).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
