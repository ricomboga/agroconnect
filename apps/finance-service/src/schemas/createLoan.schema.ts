import { z } from 'zod';

export const createLoanSchema = z.object({
  farmId: z.string().uuid(),
  type: z.enum(['agricultural_working_capital', 'back_to_school', 'asset_finance', 'emergency']),
  amountRequestedKes: z.number().positive(),
  purpose: z.string().min(1).max(500),
  repaymentMonths: z.number().int().min(1).max(60),
  partnerBankId: z.string().optional(),
});

export type CreateLoanDto = z.infer<typeof createLoanSchema>;
