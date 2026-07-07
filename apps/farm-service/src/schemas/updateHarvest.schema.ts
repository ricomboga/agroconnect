import { z } from 'zod';

export const updateHarvestSchema = z.object({
  plotId: z.string().uuid().nullable().optional(),
  crop: z.string().min(1).max(100).optional(),
  variety: z.string().max(100).optional(),
  quantityKg: z.number().positive().optional(),
  qualityGrade: z.enum(['A', 'B', 'C', 'reject']).optional(),
  harvestDate: z.string().date().optional(),
  storageLocation: z.string().max(300).optional(),
  soldQuantityKg: z.number().min(0).optional(),
  avgPriceKes: z.number().min(0).optional(),
  totalRevenueKes: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateHarvestDto = z.infer<typeof updateHarvestSchema>;
