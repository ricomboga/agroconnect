import { z } from 'zod';

export const createSubsidyProgramSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum([
    'fertiliser_subsidy',
    'seed_distribution',
    'equipment',
    'training',
    'cash_transfer',
    'irrigation',
  ]),
  administering_body: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  application_open_date: z.coerce.date(),
  application_close_date: z.coerce.date(),
  total_budget_kes: z.number().positive(),
  max_beneficiaries: z.number().int().positive().optional(),
  item_distributed: z.string().max(200).optional(),
  max_farm_size_acres: z.number().positive().optional(),
  min_farm_size_acres: z.number().positive().optional(),
  eligible_counties: z.array(z.string().min(1).max(100)).min(1),
  require_active_crop: z.boolean(),
  one_per_farmer: z.boolean(),
  id_verification_required: z.boolean(),
  farm_registration_required: z.boolean(),
  eligible_farmer_subtypes: z.array(z.enum(['crops', 'livestock', 'both'])).min(1),
  distribution_method: z.string().min(1).max(200),
  collection_points: z.array(z.string().min(1).max(200)),
});

export type CreateSubsidyProgramDto = z.infer<typeof createSubsidyProgramSchema>;
