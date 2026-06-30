import { z } from 'zod';

export const addAnimalSchema = z.object({
  animalType: z.string().min(1).max(100),
  count: z.number().int().positive(),
  breed: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export type AddAnimalDto = z.infer<typeof addAnimalSchema>;
