import { z } from 'zod';

export const supplierSummaryQuerySchema = z.object({
  low_stock_threshold: z.coerce.number().nonnegative().max(100000).default(10),
});

export type SupplierSummaryQuery = z.infer<typeof supplierSummaryQuerySchema>;
