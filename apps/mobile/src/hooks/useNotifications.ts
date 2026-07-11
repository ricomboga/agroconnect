import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import { useOfflineSync } from './useOfflineSync';

export function useNotifications() {
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ pageSize: 30 }),
    enabled: isOnline,
    staleTime: 60 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.meta.unread_count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markRead: markReadMutation.mutate,
  };
}
