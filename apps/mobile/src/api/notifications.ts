import { apiFetch } from './client';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { total: number; unread_count: number; page: number; page_size: number };
}

export const notificationsApi = {
  list: (opts?: { unreadOnly?: boolean; pageSize?: number }) => {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set('unread_only', 'true');
    if (opts?.pageSize) params.set('page_size', String(opts.pageSize));
    const qs = params.toString();
    return apiFetch<NotificationsResponse>(`/notifications${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) =>
    apiFetch<{ data: { id: string; read: boolean } }>(`/notifications/${id}/read`, { method: 'PATCH' }),
};
