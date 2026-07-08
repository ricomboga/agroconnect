import { apiFetch } from './client';

export interface NotificationPreferences {
  activityReminders: boolean;
  diagnosisResults: boolean;
  priceAlerts: boolean;
  loanUpdates: boolean;
  weatherAlerts: boolean;
  communityReplies: boolean;
  newsEvents: boolean;
}

export const DEFAULT_PREFS: NotificationPreferences = {
  activityReminders: true,
  diagnosisResults: true,
  priceAlerts: false,
  loanUpdates: true,
  weatherAlerts: true,
  communityReplies: true,
  newsEvents: true,
};

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  county: string | null;
  photoUrl: string | null;
  notificationPreferences: NotificationPreferences;
}

interface ListMeta {
  data: unknown[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export const profileApi = {
  get: () => apiFetch<{ user: UserProfile }>('/auth/me'),

  update: (dto: { full_name?: string; county?: string }) =>
    apiFetch<{ user: UserProfile }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  updateNotifications: (prefs: NotificationPreferences) =>
    apiFetch<{ user: UserProfile }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ notificationPreferences: prefs }),
    }),

  diagnosesCount: () =>
    apiFetch<ListMeta>('/diagnoses?page_size=1').catch(() => null),

  listingsCount: () =>
    apiFetch<ListMeta>('/market/listings?page_size=1').catch(() => null),
};
