import { z } from 'zod';

export const updateExpertSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  photoUrl: z.string().url().optional(),
  providerType: z.enum(['agronomist', 'vet', 'extension_officer', 'soil_lab']).optional(),
  specialisations: z.array(z.string().max(80)).min(1).max(10).optional(),
  countiesServed: z.array(z.string().max(80)).min(1).max(50).optional(),
  subCountiesServed: z.array(z.string().max(80)).max(200).optional(),
  organisation: z.string().max(150).optional(),
  licenceNumber: z.string().max(80).optional(),
  maxFarmers: z.number().int().min(0).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().min(9).max(20).optional(),
  whatsapp: z.string().max(20).optional(),
});

export type UpdateExpertDto = z.infer<typeof updateExpertSchema>;
