import { z } from 'zod';

export const createPlotSchema = z.object({
  name: z.string().min(1).max(200),
  areaAcres: z.number().positive(),
  currentCrop: z.string().max(100).optional(),
  currentCropPlantedAt: z.string().date().optional(),
  polygonGeojson: z.record(z.unknown()).optional(),
});

export type CreatePlotDto = z.infer<typeof createPlotSchema>;
