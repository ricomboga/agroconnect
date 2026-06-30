import { z } from 'zod';

export const createFarmSchema = z.object({
  name: z.string().min(1).max(200),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  county: z.string().min(1).max(100),
  subCounty: z.string().max(100).optional(),
  areaAcres: z.number().positive(),
  soilType: z.enum(['clay', 'loam', 'sandy', 'silty', 'peaty', 'chalky']).optional(),
  waterSource: z.enum(['rain', 'irrigation', 'borehole', 'river', 'mixed']).optional(),
  farmType: z.enum(['crop', 'animal', 'both']).optional(),
  firstCrop: z.string().min(1).max(100).optional(),
  firstCropVariety: z.string().max(100).optional(),
  plantingDate: z.string().date().optional(),
});

export type CreateFarmDto = z.infer<typeof createFarmSchema>;
