import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const updateFarmSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  areaAcres: z.number().positive().optional(),
  soilType: z.enum(['clay', 'loam', 'sandy', 'silty', 'peaty', 'chalky']).optional(),
  waterSource: z.enum(['rain', 'irrigation', 'borehole', 'river', 'mixed']).optional(),
  status: z.enum(['active', 'fallow', 'rented_out', 'sold']).optional(),
});

export type UpdateFarmDto = z.infer<typeof updateFarmSchema>;
