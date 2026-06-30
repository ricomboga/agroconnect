import { z } from 'zod';

export const saveCropDetailsSchema = z.object({
  crop: z.string().min(1).max(100),
  variety: z.string().max(100).optional(),
  plantingDate: z.string().date(),
  areaAcres: z.number().positive(),
});

export type SaveCropDetailsDto = z.infer<typeof saveCropDetailsSchema>;
