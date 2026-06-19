import { apiFetch } from './client';

export type ActivityType =
  | 'planting' | 'irrigation' | 'fertilising' | 'weeding'
  | 'harvesting' | 'scouting' | 'spraying' | 'other';

export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface Activity {
  id: string;
  farmId: string;
  plotId: string | null;
  type: ActivityType;
  description: string | null;
  plannedDate: string;
  actualDate: string | null;
  status: ActivityStatus;
  labourCostKes: number | null;
  createdAt: string;
}

export interface CreateActivityDto {
  type: ActivityType;
  description?: string;
  plannedDate: string;
  plotId?: string;
  labourCostKes?: number;
}

export interface UpdateActivityDto {
  type?: ActivityType;
  description?: string;
  plannedDate?: string;
  actualDate?: string;
  status?: ActivityStatus;
  plotId?: string;
  labourCostKes?: number;
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
    apiFetch<{ data: Activity }>(`/farms/${farmId}/activities`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (farmId: string, activityId: string, dto: UpdateActivityDto) =>
    apiFetch<{ data: Activity }>(`/farms/${farmId}/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
