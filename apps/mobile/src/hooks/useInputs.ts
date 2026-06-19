import { useQuery } from '@tanstack/react-query';
import { inputApi, type InputType } from '../api/input';
import { useOfflineSync } from './useOfflineSync';

interface UseInputsParams {
  farmId: string;
  season?: number;
  type?: InputType;
  page?: number;
  pageSize?: number;
}

export function useInputs({ farmId, season, type, page = 1, pageSize = 50 }: UseInputsParams) {
  const { isOnline } = useOfflineSync();
  return useQuery({
    queryKey: ['inputs', farmId, season, type, page, pageSize],
    queryFn: () => inputApi.list(farmId, { season, type, page, pageSize }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });
}
