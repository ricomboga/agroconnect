import { useQuery } from '@tanstack/react-query';
import { farmApi, type Farm } from '../api/farm';
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
