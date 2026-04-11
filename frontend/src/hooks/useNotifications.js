import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

const fetchNotifications = async ({ page = 1, limit = 20, unread = false } = {}) => {
  const response = await axiosInstance.get('/notifications', {
    params: {
      page,
      limit,
      ...(unread ? { unread: true } : {}),
    },
  });

  return {
    notifications: response.data.data.notifications || [],
    unreadCount: response.data.data.unreadCount || 0,
    pagination: response.data.pagination,
  };
};

const fetchUnreadCount = async () => {
  const response = await axiosInstance.get('/notifications/count');
  return response.data.data.unreadCount || 0;
};

export function useNotifications(options = {}) {
  const queryClient = useQueryClient();
  const { page = 1, limit = 20, unread = false } = options;

  const notificationsQuery = useQuery({
    queryKey: ['notifications', { page, limit, unread }],
    queryFn: () => fetchNotifications({ page, limit, unread }),
    refetchInterval: 30000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
  });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
      return response.data.data.notification;
    },
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.put('/notifications/read-all');
    },
    onSuccess: invalidateNotifications,
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await axiosInstance.delete(`/notifications/${notificationId}`);
    },
    onSuccess: invalidateNotifications,
  });

  return {
    notifications: notificationsQuery.data?.notifications || [],
    unreadCount:
      unreadCountQuery.data ?? notificationsQuery.data?.unreadCount ?? 0,
    pagination: notificationsQuery.data?.pagination,
    isLoading: notificationsQuery.isLoading,
    isFetching: notificationsQuery.isFetching,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    deleteNotification: deleteNotificationMutation.mutateAsync,
  };
}
