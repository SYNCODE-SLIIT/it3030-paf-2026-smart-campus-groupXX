'use client';

import React from 'react';
import { Bell, CheckCircle2, XCircle, Clock, AlertCircle, X } from 'lucide-react';
import { Badge, Button, Card, Chip } from '@/components/ui';
import type { BookingNotificationResponse, NotificationType } from '@/lib/api-types';

interface NotificationCenterProps {
  notifications: BookingNotificationResponse[];
  onMarkAsRead?: (notificationId: string) => Promise<void>;
  onClear?: () => void;
  isLoading?: boolean;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'BOOKING_APPROVED':
      return <CheckCircle2 size={16} style={{ color: 'var(--text-success)' }} />;
    case 'BOOKING_REJECTED':
      return <XCircle size={16} style={{ color: 'var(--text-error)' }} />;
    case 'BOOKING_CANCELLED':
      return <AlertCircle size={16} style={{ color: 'var(--text-warning)' }} />;
    case 'BOOKING_REMINDER_24H':
    case 'BOOKING_REMINDER_1H':
      return <Clock size={16} style={{ color: 'var(--text-info)' }} />;
    case 'MODIFICATION_APPROVED':
      return <CheckCircle2 size={16} style={{ color: 'var(--text-success)' }} />;
    case 'MODIFICATION_REJECTED':
      return <XCircle size={16} style={{ color: 'var(--text-error)' }} />;
    default:
      return <Bell size={16} />;
  }
}

function getNotificationLabel(type: NotificationType): string {
  switch (type) {
    case 'BOOKING_APPROVED':
      return 'Booking Approved';
    case 'BOOKING_REJECTED':
      return 'Booking Rejected';
    case 'BOOKING_CANCELLED':
      return 'Booking Cancelled';
    case 'BOOKING_REMINDER_24H':
      return 'Reminder: 24 hours';
    case 'BOOKING_REMINDER_1H':
      return 'Reminder: 1 hour';
    case 'MODIFICATION_APPROVED':
      return 'Modification Approved';
    case 'MODIFICATION_REJECTED':
      return 'Modification Rejected';
    default:
      return 'Notification';
  }
}

function getNotificationColor(type: NotificationType): 'green' | 'red' | 'yellow' | 'blue' | 'neutral' {
  switch (type) {
    case 'BOOKING_APPROVED':
    case 'MODIFICATION_APPROVED':
      return 'green';
    case 'BOOKING_REJECTED':
    case 'MODIFICATION_REJECTED':
      return 'red';
    case 'BOOKING_CANCELLED':
      return 'yellow';
    case 'BOOKING_REMINDER_24H':
    case 'BOOKING_REMINDER_1H':
      return 'blue';
    default:
      return 'neutral';
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en-LK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onClear,
  isLoading,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (notifications.length === 0) {
    return (
      <Card style={{ padding: 24, textAlign: 'center' }}>
        <Bell size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>No notifications yet</p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={20} />
          <span style={{ fontWeight: 600 }}>Notifications</span>
          {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
        </div>
        {onClear && notifications.length > 0 && (
          <Button variant="ghost" onClick={onClear} disabled={isLoading} style={{ fontSize: 12 }}>
            Clear All
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div style={{ display: 'grid', gap: 8 }}>
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            style={{
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 12,
              alignItems: 'center',
              opacity: notification.readAt ? 0.7 : 1,
              backgroundColor: notification.readAt ? 'transparent' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            hoverable
          >
            {/* Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getNotificationIcon(notification.notificationType)}
            </div>

            {/* Content */}
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  {getNotificationLabel(notification.notificationType)}
                </span>
                <Chip color={getNotificationColor(notification.notificationType)} style={{ fontSize: 11 }}>
                  {notification.emailSent ? '📧' : ''} {notification.smsSent ? '📱' : ''}
                </Chip>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatTime(notification.sentAt)}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!notification.readAt && onMarkAsRead && (
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  disabled={isLoading}
                  style={{ padding: 4 }}
                  title="Mark as read"
                >
                  <CheckCircle2 size={16} />
                </Button>
              )}
              {notification.readAt && <CheckCircle2 size={16} style={{ color: 'var(--text-success)' }} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
