import { useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityStatus } from '../api/activity';
import { useOfflineSync } from './useOfflineSync';

interface UseActivitiesParams {
  farmId: string;
  fromDate?: string;
  toDate?: string;
  status?: ActivityStatus;
  page?: number;
  pageSize?: number;
}

export function useActivities({ farmId, fromDate, toDate, status, page = 1, pageSize = 100 }: UseActivitiesParams) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['activities', farmId, fromDate, toDate, status, page, pageSize],
    queryFn: () => activityApi.list(farmId, { fromDate, toDate, status, page, pageSize }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });
}
