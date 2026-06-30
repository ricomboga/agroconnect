import { z } from 'zod';

export const createExpertSchema = z.object({
  name: z.string().min(2).max(100),
  photoUrl: z.string().url().optional(),
  providerType: z.enum(['agronomist', 'vet', 'extension_officer']),
  specialisations: z.array(z.string().max(80)).min(1).max(10),
  countiesServed: z.array(z.string().max(80)).min(1).max(50),
  bio: z.string().max(1000).optional(),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  phone: z.string().min(9).max(20),
  whatsapp: z.string().max(20).optional(),
});

export type CreateExpertDto = z.infer<typeof createExpertSchema>;
