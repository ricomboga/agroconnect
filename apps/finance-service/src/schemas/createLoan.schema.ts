import { z } from 'zod';

export const createLoanSchema = z.object({
  productId:          z.string().optional(),
  farmId:             z.string().uuid().optional(),
  type:               z.enum(['agricultural_working_capital', 'back_to_school', 'asset_finance', 'emergency']).optional(),
  amountRequestedKes: z.number().positive(),
  purpose:            z.string().min(1).max(500),
  repaymentMonths:    z.number().int().min(1).max(60),
  partnerBankId:      z.string().optional(),
  farmGpsLat:         z.number().min(-90).max(90).optional(),
  farmGpsLng:         z.number().min(-180).max(180).optional(),
});

export type CreateLoanDto = z.infer<typeof createLoanSchema>;
