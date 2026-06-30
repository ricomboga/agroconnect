import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listExpertsQuerySchema = paginationQuerySchema.extend({
  county: z.string().max(100).optional(),
  providerType: z.enum(['agronomist', 'vet', 'extension_officer']).optional(),
});

export type ListExpertsQuery = z.infer<typeof listExpertsQuerySchema>;
