import { apiFetch } from './client';

export type ActivityType =
  | 'planting' | 'irrigation' | 'fertilising' | 'pesticide'
  | 'harvesting' | 'weeding' | 'other';

export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface Activity {
  id: string;
  farmId: string;
  plotId: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  completedDate: string | null;
  status: ActivityStatus;
  labourCostKes: number | null;
  assignedToWorkerId: string | null;
  notes: string | null;
  skipReason: string | null;
  createdAt: string;
}

export interface ActivityDetail extends Activity {
  plotName: string | null;
  cropName: string | null;
}

export interface CreateActivityDto {
  type: ActivityType;
  title: string;
  description?: string;
  scheduledDate: string;
  scheduledTime?: string;
  plotId?: string;
  labourCostKes?: number;
  notes?: string;
  assignedToWorkerId?: string;
}

export interface UpdateActivityDto {
  type?: ActivityType;
  title?: string;
  description?: string;
  scheduledDate?: string;
  scheduledTime?: string | null;
  completedDate?: string;
  status?: ActivityStatus;
  plotId?: string | null;
  labourCostKes?: number;
  notes?: string;
  skipReason?: string;
  assignedToWorkerId?: string | null;
}

interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const activityApi = {
  list: (
    farmId: string,
    params?: { fromDate?: string; toDate?: string; status?: ActivityStatus; page?: number; pageSize?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.set('from_date', params.fromDate);
    if (params?.toDate) qs.set('to_date', params.toDate);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('page_size', String(params.pageSize));
    const q = qs.toString();
    return apiFetch<ListResponse<Activity>>(`/farms/${farmId}/activities${q ? `?${q}` : ''}`);
  },

  create: (farmId: string, dto: CreateActivityDto) =>
    apiFetch<{ data: ActivityDetail }>(`/farms/${farmId}/activities`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  get: (farmId: string, activityId: string) =>
    apiFetch<{ data: ActivityDetail }>(`/farms/${farmId}/activities/${activityId}`),

  update: (farmId: string, activityId: string, dto: UpdateActivityDto) =>
    apiFetch<{ data: ActivityDetail }>(`/farms/${farmId}/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
