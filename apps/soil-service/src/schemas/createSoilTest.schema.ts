import { z } from 'zod';

export const createSoilTestSchema = z.object({
  testedAt: z.string().date('testedAt must be a valid date (YYYY-MM-DD)'),
  ph: z.number().min(0, 'ph must be ≥ 0').max(14, 'ph must be ≤ 14'),
  plotId: z.string().uuid().optional(),
  nitrogenPpm: z.number().nonnegative().optional(),
  phosphorusPpm: z.number().nonnegative().optional(),
  potassiumPpm: z.number().nonnegative().optional(),
  organicMatterPct: z.number().min(0).max(100).optional(),
  labName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateSoilTestDto = z.infer<typeof createSoilTestSchema>;
