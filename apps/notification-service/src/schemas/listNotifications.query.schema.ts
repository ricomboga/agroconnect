import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.string().optional(),
  page_size: z.string().optional(),
  unread_only: z.enum(['true', 'false']).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
