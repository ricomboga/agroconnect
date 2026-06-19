import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'equipment', 'veterinary', 'other']),
  brand: z.string().max(100).optional(),
  description: z.string().min(1).max(2000),
  unit: z.string().min(1).max(50),
  pricePerUnitKes: z.number().positive(),
  stockQuantity: z.number().nonnegative(),
  sku: z.string().max(100).optional(),
  countyAvailability: z.array(z.string()).min(1),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
