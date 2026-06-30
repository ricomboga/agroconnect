import { z } from 'zod';

export const createTransactionSchema = z.object({
  type:          z.enum(['income', 'expense']),
  amountKes:     z.number().positive(),
  category:      z.string().min(1).max(100),
  linkedTo:      z.string().max(200).optional(),
  buyerSupplier: z.string().max(200).optional(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes:         z.string().max(1000).optional(),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
