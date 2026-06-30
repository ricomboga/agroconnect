import { apiFetch } from './client';

export interface FarmPlot {
  id: string;
  name: string;
  areaAcres: number;
  currentCrop: string | null;
  currentCropPlantedAt: string | null;
  cropVariety: string | null;
  plantingDate: string | null;
  polygonGeojson: unknown | null;
}

export interface Farm {
  id: string;
  name: string;
  county: string;
  subCounty: string | null;
  areaAcres: number;
  soilType: string | null;
  waterSource: string | null;
  locationLat: number | null;
  locationLng: number | null;
  status: 'active' | 'fallow' | 'rented_out' | 'sold';
  farmType: 'crop' | 'animal' | 'both';
  ownerId: string;
  plots: FarmPlot[];
  createdAt: string;
}

export interface FarmSummary {
  farmId: string;
  totalYieldKg: number;
  totalInputCostsKes: number;
  totalLabourCostsKes: number;
  totalCostsKes: number;
  totalRevenueKes: number;
  profitEstimateKes: number;
  dateRange?: { from: string; to: string };
}

export interface FarmActivity {
  id: string;
  farmId: string;
  plotId: string | null;
  type: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  completedDate: string | null;
  status: 'pending' | 'completed' | 'skipped';
  labourCostKes: number | null;
  assignedToWorkerId: string | null;
  notes: string | null;
  skipReason: string | null;
  createdAt: string;
  plotName: string | null;
  cropName: string | null;
}

export interface ScheduledActivity {
  id: string;
  title: string;
  activityType: string;
  activityEmoji: string;
  status: 'overdue' | 'today' | 'this_week' | 'upcoming';
  scheduledDate: string;
  plotName: string | null;
  cropName: string | null;
  animalName: string | null;
  aiReason: string | null;
  assignedToWorkerId: string | null;
  assignedToWorkerName: string | null;
  daysLate: number | null;
  daysUntil: number | null;
  dayLabel?: string;
}

export interface FarmWorker {
  id: string;
  userId: string;
  fullName: string;
  role: string;
  phone: string | null;
  assignedTaskCount?: number;
  isActive?: boolean;
}

export interface AnimalGroup {
  id: string;
  farmId: string;
  animalType: string;
  count: number;
  breed: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateAnimalDto {
  animalType: string;
  count: number;
  breed?: string;
  notes?: string;
}

export interface AddWorkerDto {
  userId: string;
  role: 'manager' | 'field_worker' | 'harvester' | 'sprayer' | 'driver';
}

export interface UserLookupResult {
  id: string;
  fullName: string;
  phone: string;
}

export interface CompleteActivityDto {
  status: 'completed' | 'skipped';
  completedDate?: string; // required by backend when status === 'completed'
  labourCostKes?: number;
  notes?: string;
  assignedToWorkerId?: string | null;
  skipReason?: string;
}

export interface CreateFarmDto {
  name: string;
  county: string;
  areaAcres: number;
  soilType?: string;
  waterSource?: string;
  subCounty?: string;
  locationLat?: number;
  locationLng?: number;
  farmType?: 'crop' | 'animal' | 'both';
  firstCrop?: string;
  firstCropVariety?: string;
  plantingDate?: string;
}

export interface CreateCropDto {
  cropType: string;
  variety?: string;
  plantingDate: string;
  areaAcres?: number;
  plotNumber?: string;
}

export interface UpdateFarmDto {
  name?: string;
  county?: string;
  subCounty?: string;
  areaAcres?: number;
  soilType?: string;
  waterSource?: string;
  locationLat?: number;
  locationLng?: number;
  status?: 'active' | 'fallow' | 'rented_out' | 'sold';
}

interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const farmApi = {
  list: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('page_size', String(params.pageSize));
    const q = qs.toString();
    return apiFetch<ListResponse<Farm>>(`/farms${q ? `?${q}` : ''}`);
  },

  get: (farmId: string) =>
    apiFetch<{ data: Farm }>(`/farms/${farmId}`),

  create: (dto: CreateFarmDto) =>
    apiFetch<{ data: Farm }>('/farms', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (farmId: string, dto: UpdateFarmDto) =>
    apiFetch<{ data: Farm }>(`/farms/${farmId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  addCrop: (farmId: string, dto: CreateCropDto) =>
    apiFetch<{ data: { plot: FarmPlot; activitiesCreated: number } }>(`/farms/${farmId}/crops`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  delete: (farmId: string) =>
    apiFetch<void>(`/farms/${farmId}`, { method: 'DELETE' }),

  listActivities: (
    farmId: string,
    params?: { fromDate?: string; toDate?: string; status?: string; page?: number; pageSize?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.set('from_date', params.fromDate);
    if (params?.toDate) qs.set('to_date', params.toDate);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('page_size', String(params.pageSize));
    const q = qs.toString();
    return apiFetch<ListResponse<FarmActivity>>(`/farms/${farmId}/activities${q ? `?${q}` : ''}`);
  },

  schedule: (farmId: string) =>
    apiFetch<{ data: ScheduledActivity[] }>(`/farms/${farmId}/schedule`),

  workers: (farmId: string) =>
    apiFetch<{ data: FarmWorker[] }>(`/farms/${farmId}/workers`),

  completeActivity: (farmId: string, activityId: string, dto: CompleteActivityDto) =>
    apiFetch<{ data: FarmActivity }>(`/farms/${farmId}/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  summary: (farmId: string, params?: { fromDate?: string; toDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.set('from_date', params.fromDate);
    if (params?.toDate) qs.set('to_date', params.toDate);
    const q = qs.toString();
    return apiFetch<{ data: FarmSummary }>(`/farms/${farmId}/summary${q ? `?${q}` : ''}`);
  },

  addAnimal: (farmId: string, dto: CreateAnimalDto) =>
    apiFetch<{ data: AnimalGroup }>(`/farms/${farmId}/animals`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  listAnimals: (farmId: string) =>
    apiFetch<{ data: AnimalGroup[] }>(`/farms/${farmId}/animals`),

  addWorker: (farmId: string, dto: AddWorkerDto) =>
    apiFetch<{ data: FarmWorker }>(`/farms/${farmId}/workers`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  lookupUserByPhone: (phone: string) =>
    apiFetch<{ data: UserLookupResult }>(`/auth/users/lookup?phone=${encodeURIComponent(phone)}`),
};
