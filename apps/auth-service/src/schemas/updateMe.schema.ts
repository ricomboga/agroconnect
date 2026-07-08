import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const updateMeSchema = z
  .object({
    fullName: z.string().min(2).max(100).optional(),
    email:    z.string().email().nullable().optional(),
    county:   z.enum(KENYA_COUNTIES).optional(),
    language: z.enum(['sw', 'en']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'error.update.empty' });

export type UpdateMeDto = z.infer<typeof updateMeSchema>;
