import { z } from 'zod';

export const MEDIA_CATEGORIES = [
  'farm-photos',
  'diagnosis-images',
  'govt-documents',
  'product-photos',
  'profile-photos',
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const uploadBodySchema = z.object({
  category: z.enum(MEDIA_CATEGORIES),
  entity_id: z.string().min(1).max(128).regex(/^[\w-]+$/, 'entity_id must be alphanumeric, hyphens, or underscores'),
});

export type UploadBodyDto = z.infer<typeof uploadBodySchema>;
