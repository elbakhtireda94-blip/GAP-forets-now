import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  recipient_user_id: string;
  title: string;
  message: string;
  notification_type: string;
  severity: string;
  pdfcp_id?: string;
  year?: number;
  composante?: string;
  localisation?: string;
  cancellation_reason?: string;
  cancelled_by_name?: string;
  cancelled_by_role?: string;
  cancelled_at?: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationParams {
  recipient_user_id: string;
  title: string;
  message: string;
  notification_type: string;
  severity: string;
  pdfcp_id?: string;
  year?: number;
  composante?: string;
  localisation?: string;
  cancellation_reason?: string;
  cancelled_by_name?: string;
  cancelled_by_role?: string;
  cancelled_at?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user notifications
  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.auth_user_id],
    queryFn: async () => {
      if (!user?.auth_user_id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', user.auth_user_id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user?.auth_user_id,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.auth_user_id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.auth_user_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.auth_user_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.auth_user_id, queryClient]);

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.auth_user_id] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.auth_user_id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('recipient_user_id', user.auth_user_id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.auth_user_id] });
    },
  });

  // Create notification(s) — used by cancellation logic
  const createNotifications = useMutation({
    mutationFn: async (notifications: CreateNotificationParams[]) => {
      if (notifications.length === 0) return;
      const { error } = await supabase
        .from('notifications')
        .insert(notifications as any);
      if (error) throw error;
    },
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    createNotifications: createNotifications.mutateAsync,
  };
}
