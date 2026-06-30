import { z } from 'zod';

export const addCropSchema = z.object({
  cropType: z.string().min(1).max(100),
  variety: z.string().max(100).optional(),
  plantingDate: z.string().date(),
  areaAcres: z.number().positive().optional(),
  plotNumber: z.string().max(100).optional(),
});

export type AddCropDto = z.infer<typeof addCropSchema>;
