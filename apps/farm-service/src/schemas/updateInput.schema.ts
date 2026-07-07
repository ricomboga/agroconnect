import { z } from 'zod';

export const updateInputSchema = z.object({
  activityId: z.string().uuid().nullable().optional(),
  type: z.enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other']).optional(),
  productName: z.string().min(1).max(300).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  unitCostKes: z.number().min(0).optional(),
  totalCostKes: z.number().min(0).optional(),
  appliedDate: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateInputDto = z.infer<typeof updateInputSchema>;
