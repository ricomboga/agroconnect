import { z } from 'zod';

export const reportQuerySchema = z
  .object({
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date must be YYYY-MM-DD').optional(),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date must be YYYY-MM-DD').optional(),
  })
  .refine((v) => !v.from_date || !v.to_date || v.from_date <= v.to_date, {
    message: 'from_date must be on or before to_date',
    path: ['from_date'],
  });

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
