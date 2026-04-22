'use client';

import React from 'react';

import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/api-client';
import type { NotificationDomain, NotificationResponse } from '@/lib/api-types';

export function useNotifications(accessToken: string | null, domain?: NotificationDomain) {
  const [notifications, setNotifications] = React.useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshCount = React.useCallback(async () => {
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await getNotificationUnreadCount(accessToken);
      setUnreadCount(response.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, [accessToken]);

  const refreshNotifications = React.useCallback(async (status: 'all' | 'unread' = 'all') => {
    if (!accessToken) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listNotifications(accessToken, { status, domain, limit: 40 });
      setNotifications(response);
      await refreshCount();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, domain, refreshCount]);

  const markRead = React.useCallback(async (notification: NotificationResponse) => {
    if (!accessToken) {
      return;
    }

    await markNotificationAsRead(accessToken, notification.id);
    setNotifications((current) =>
      current.map((item) => (
        item.id === notification.id
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item
      )),
    );
    await refreshCount();
  }, [accessToken, refreshCount]);

  const markAllRead = React.useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const response = await markAllNotificationsAsRead(accessToken);
    setUnreadCount(response.unreadCount);
    setNotifications((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
  }, [accessToken]);

  React.useEffect(() => {
    void refreshCount();
    if (!accessToken) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void refreshCount();
    }, 45_000);

    return () => window.clearInterval(interval);
  }, [accessToken, refreshCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refreshCount,
    refreshNotifications,
    markRead,
    markAllRead,
  };
}
