import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { farmApi, type Farm, type CreateAnimalDto, type AddWorkerDto } from '../api/farm';
import { activityApi, type ActivityStatus } from '../api/activity';
import { useOfflineSync } from './useOfflineSync';

export function useFarms(page = 1, pageSize = 20) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['farms', page, pageSize],
    queryFn: () => farmApi.list({ page, pageSize }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });
}

export function useFarm(farmId: string) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['farm', farmId],
    queryFn: () => farmApi.get(farmId),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    select: (res): Farm => res.data,
  });
}

export interface UseFarmActivitiesParams {
  fromDate?: string;
  toDate?: string;
  status?: ActivityStatus;
  page?: number;
  pageSize?: number;
}

export function useFarmActivities(farmId: string, params?: UseFarmActivitiesParams) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['farm-activities', farmId, params],
    queryFn: () =>
      activityApi.list(farmId, {
        fromDate: params?.fromDate,
        toDate: params?.toDate,
        status: params?.status,
        page: params?.page,
        pageSize: params?.pageSize,
      }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    enabled: !!farmId,
  });
}

export function useFarmSchedule(farmId: string) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['farms/schedule', farmId],
    queryFn: () => farmApi.schedule(farmId),
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
    enabled: !!farmId,
  });
}

export function useFarmWorkers(farmId: string) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['farms/workers', farmId],
    queryFn: () => farmApi.workers(farmId),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    enabled: !!farmId,
  });
}

export function useFarmAnimals(farmId: string) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['farms/animals', farmId],
    queryFn: () => farmApi.listAnimals(farmId),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    enabled: !!farmId,
  });
}

export function useAddAnimal(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAnimalDto) => farmApi.addAnimal(farmId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['farms/animals', farmId] });
      void queryClient.invalidateQueries({ queryKey: ['farm', farmId] });
    },
  });
}

export function useAddWorker(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AddWorkerDto) => farmApi.addWorker(farmId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['farms/workers', farmId] });
    },
  });
}
