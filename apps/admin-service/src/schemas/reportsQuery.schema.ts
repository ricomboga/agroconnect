import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const livestockReportQuerySchema = z.object({
  county: z.enum(KENYA_COUNTIES).optional(),
  animalType: z.string().min(1).optional(),
});

export type LivestockReportQuery = z.infer<typeof livestockReportQuerySchema>;

export const reportTypeParamSchema = z.object({
  type: z.enum(['farmers-by-county', 'livestock', 'loans-by-institution', 'experts', 'suppliers', 'lenders', 'govt-officers']),
});

export type ReportTypeParam = z.infer<typeof reportTypeParamSchema>;
