import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listExpertsQuerySchema = paginationQuerySchema.extend({
  county: z.enum(KENYA_COUNTIES).optional(),
  providerType: z.enum(['agronomist', 'vet', 'extension_officer', 'soil_lab']).optional(),
});

export type ListExpertsQuery = z.infer<typeof listExpertsQuerySchema>;
