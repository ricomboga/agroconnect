import { z } from 'zod';

export const createHarvestSchema = z.object({
  plotId: z.string().uuid().optional(),
  crop: z.string().min(1).max(100),
  variety: z.string().max(100).optional(),
  quantityKg: z.number().positive(),
  qualityGrade: z.enum(['A', 'B', 'C', 'reject']).optional(),
  harvestDate: z.string().date(),
  storageLocation: z.string().max(300).optional(),
  soldQuantityKg: z.number().min(0).default(0),
  avgPriceKes: z.number().min(0).optional(),
  totalRevenueKes: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateHarvestDto = z.infer<typeof createHarvestSchema>;
