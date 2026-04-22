'use client';

import React from 'react';
import { AlertCircle, Bell, CheckCircle2, Clock, Mail, ShieldAlert } from 'lucide-react';

import { Alert, Badge, Button, Card, Chip, Skeleton } from '@/components/ui';
import type { NotificationDomain, NotificationResponse, NotificationSeverity } from '@/lib/api-types';

interface NotificationCenterProps {
  notifications: NotificationResponse[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
  onMarkAsRead?: (notification: NotificationResponse) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
  onNavigate?: (notification: NotificationResponse) => void;
}

function severityIcon(severity: NotificationSeverity) {
  switch (severity) {
    case 'SUCCESS':
      return <CheckCircle2 size={16} style={{ color: 'var(--text-success)' }} />;
    case 'WARNING':
      return <AlertCircle size={16} style={{ color: 'var(--text-warning)' }} />;
    case 'CRITICAL':
      return <ShieldAlert size={16} style={{ color: 'var(--text-error)' }} />;
    case 'ACTION_REQUIRED':
      return <Clock size={16} style={{ color: 'var(--yellow-700)' }} />;
    default:
      return <Bell size={16} style={{ color: 'var(--text-muted)' }} />;
  }
}

function domainColor(domain: NotificationDomain): 'yellow' | 'green' | 'blue' | 'neutral' {
  switch (domain) {
    case 'TICKET':
      return 'yellow';
    case 'BOOKING':
      return 'blue';
    case 'CATALOG':
      return 'green';
    default:
      return 'neutral';
  }
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const diff = Date.now() - parsed.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function NotificationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`notification-skeleton-${index}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            gap: 12,
            alignItems: 'start',
            padding: 14,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <Skeleton variant="circle" width={16} height={16} style={{ marginTop: 2 }} />
          <span style={{ display: 'grid', gap: 7, minWidth: 0 }}>
            <Skeleton variant="line" width="48%" height={12} />
            <Skeleton variant="line" width="92%" height={10} />
            <Skeleton variant="line" width="64%" height={10} />
            <Skeleton variant="line" width={86} height={8} />
          </span>
          <Skeleton variant="line" width={44} height={20} style={{ borderRadius: 100 }} />
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter({
  notifications,
  loading,
  error,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  if (error) {
    return (
      <Alert variant="error" title="Notifications unavailable">
        {error}
      </Alert>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={20} />
          <span style={{ fontWeight: 800, color: 'var(--text-h)' }}>Notifications</span>
          {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={() => void onRefresh()} disabled={loading}>
              Refresh
            </Button>
          )}
          {onMarkAllAsRead && unreadCount > 0 && (
            <Button variant="subtle" size="sm" onClick={() => void onMarkAllAsRead()} disabled={loading}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading && notifications.length === 0 ? (
        <NotificationListSkeleton />
      ) : notifications.length === 0 ? (
        <Card style={{ padding: 28, textAlign: 'center' }}>
          <Bell size={30} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No notifications yet.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate?.(notification)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onNavigate?.(notification);
                }
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'start',
                width: '100%',
                padding: 14,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: notification.readAt ? 'var(--surface)' : 'rgba(238,202,68,.08)',
                textAlign: 'left',
                cursor: notification.actionUrl ? 'pointer' : 'default',
                boxShadow: notification.readAt ? 'none' : '0 1px 10px rgba(238,202,68,.12)',
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', marginTop: 2 }}>
                {severityIcon(notification.severity)}
                {!notification.readAt && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -5,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--text-error)',
                    }}
                  />
                )}
              </span>
              <span style={{ display: 'grid', gap: 5, minWidth: 0 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-h)', fontSize: 13 }}>{notification.title}</span>
                  <Chip color={domainColor(notification.domain)}>{notification.domain}</Chip>
                  {notification.emailDeliveryStatus === 'SENT' && (
                    <span title="Email sent" style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                      <Mail size={13} />
                    </span>
                  )}
                </span>
                {notification.body && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
                    {notification.body}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatTime(notification.createdAt)}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!notification.readAt && onMarkAsRead && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onMarkAsRead(notification);
                    }}
                  >
                    Read
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
