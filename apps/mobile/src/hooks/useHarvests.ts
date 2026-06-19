import { useQuery } from '@tanstack/react-query';
import { harvestApi } from '../api/harvest';
import { useOfflineSync } from './useOfflineSync';

export function useHarvests(farmId: string, page = 1, pageSize = 50) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['harvests', farmId, page, pageSize],
    queryFn: () => harvestApi.list(farmId, { page, pageSize }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });
}
