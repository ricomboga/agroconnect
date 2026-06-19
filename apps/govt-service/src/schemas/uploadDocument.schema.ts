import { z } from 'zod';

export const uploadDocumentBodySchema = z.object({
  documentType: z.enum(['national_id', 'title_deed', 'kra_pin', 'business_permit', 'other']),
  registrationId: z.string().uuid().optional(),
});

export type UploadDocumentDto = z.infer<typeof uploadDocumentBodySchema>;
