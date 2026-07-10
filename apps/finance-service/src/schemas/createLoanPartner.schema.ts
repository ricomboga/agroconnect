import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const createLoanPartnerSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(['bank', 'microfinance', 'sacco', 'mobile_lender', 'ngo_grant', 'cooperative']),
  licenceNo: z.string().max(80).optional(),
  paybill: z.string().max(20).optional(),
  headOfficeCounty: z.enum(KENYA_COUNTIES).optional(),
  headOfficeSubCounty: z.string().max(100).optional(),
  minLoanKes: z.number().min(0).optional(),
  maxLoanKes: z.number().min(0).optional(),
  processingDays: z.number().int().min(1).optional(),
  interestRateAnnual: z.number().min(0).max(100).optional(),
});

export type CreateLoanPartnerDto = z.infer<typeof createLoanPartnerSchema>;
