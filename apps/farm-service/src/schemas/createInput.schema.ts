import { z } from 'zod';

export const createInputSchema = z.object({
  activityId: z.string().uuid().optional(),
  type: z.enum(['seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other']),
  productName: z.string().min(1).max(300),
  supplierId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(50),
  unitCostKes: z.number().min(0),
  totalCostKes: z.number().min(0),
  appliedDate: z.string().date(),
  notes: z.string().max(2000).optional(),
});

export type CreateInputDto = z.infer<typeof createInputSchema>;
