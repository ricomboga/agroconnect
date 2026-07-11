import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';

export const updateOperatingCountiesSchema = z.object({
  operatingCounties: z.array(z.enum(KENYA_COUNTIES)).min(1).max(47),
});

export type UpdateOperatingCountiesDto = z.infer<typeof updateOperatingCountiesSchema>;
