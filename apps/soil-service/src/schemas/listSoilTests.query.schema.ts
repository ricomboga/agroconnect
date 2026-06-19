import { z } from 'zod';
import { paginationQuerySchema } from '@agroconnect/shared';

export const listSoilTestsQuerySchema = paginationQuerySchema;

export type ListSoilTestsQuery = z.infer<typeof listSoilTestsQuerySchema>;
