import { z } from 'zod';

export const updateSubsidyApplicationStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  approved_items: z.string().max(500).optional(),
  delivery_date: z.coerce.date().optional(),
  collection_point: z.string().max(200).optional(),
  transport_provided: z.boolean().optional(),
  officer_notes: z.string().max(1000).optional(),
});

export type UpdateSubsidyApplicationStatusDto = z.infer<typeof updateSubsidyApplicationStatusSchema>;
