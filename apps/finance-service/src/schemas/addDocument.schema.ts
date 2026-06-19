import { z } from 'zod';

export const addDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  documentType: z.enum(['national_id', 'land_title', 'farm_photo', 'bank_statement', 'payslip', 'other']),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1).default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative().default(0),
});

export type AddDocumentDto = z.infer<typeof addDocumentSchema>;
