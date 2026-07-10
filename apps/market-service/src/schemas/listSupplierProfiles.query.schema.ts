import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const listSupplierProfilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  category: z.string().max(80).optional(),
  userId: z.string().uuid().optional(),
});

export type ListSupplierProfilesQuery = z.infer<typeof listSupplierProfilesQuerySchema>;
