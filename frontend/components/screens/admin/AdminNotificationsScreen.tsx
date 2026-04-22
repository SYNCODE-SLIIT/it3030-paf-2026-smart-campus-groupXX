'use client';

import React from 'react';
import { Mail, RefreshCw } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/components/notifications/useNotifications';
import { getErrorMessage, listNotificationDeliveries } from '@/lib/api-client';
import type { NotificationDeliveryResponse, NotificationDeliveryStatus, NotificationResponse } from '@/lib/api-types';

type TabKey = 'inbox' | 'deliveries';

function formatTime(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function statusColor(status: NotificationDeliveryStatus): 'green' | 'red' | 'yellow' | 'neutral' {
  switch (status) {
    case 'SENT':
      return 'green';
    case 'FAILED':
      return 'red';
    case 'PENDING':
      return 'yellow';
    default:
      return 'neutral';
  }
}

export function AdminNotificationsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const notifications = useNotifications(accessToken);
  const [activeTab, setActiveTab] = React.useState<TabKey>('inbox');
  const [deliveries, setDeliveries] = React.useState<NotificationDeliveryResponse[]>([]);
  const [deliveryStatus, setDeliveryStatus] = React.useState<NotificationDeliveryStatus | ''>('');
  const [deliveryLoading, setDeliveryLoading] = React.useState(false);
  const [deliveryError, setDeliveryError] = React.useState<string | null>(null);

  const loadDeliveries = React.useCallback(async () => {
    if (!accessToken) {
      setDeliveryError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setDeliveryLoading(true);
    setDeliveryError(null);
    try {
      const response = await listNotificationDeliveries(accessToken, {
        status: deliveryStatus || undefined,
        limit: 50,
      });
      setDeliveries(response);
    } catch (error) {
      setDeliveryError(getErrorMessage(error, 'Could not load notification deliveries.'));
      setDeliveries([]);
    } finally {
      setDeliveryLoading(false);
    }
  }, [accessToken, deliveryStatus]);

  React.useEffect(() => {
    void notifications.refreshNotifications('all');
  }, [notifications.refreshNotifications]);

  React.useEffect(() => {
    if (activeTab === 'deliveries') {
      void loadDeliveries();
    }
  }, [activeTab, loadDeliveries]);

  async function handleNavigate(notification: NotificationResponse) {
    await notifications.markRead(notification);
    if (notification.actionUrl) {
      window.location.assign(notification.actionUrl);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Insights
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: 'var(--text-h)' }}>
            Notifications
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 680, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Review actionable system notifications and email delivery state.
          </p>
        </div>
        <Chip color="yellow" dot>Admin</Chip>
      </div>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'inbox' as const, label: 'Inbox' },
          { key: 'deliveries' as const, label: 'Email Delivery' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 14px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--yellow-400)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? 'var(--text-h)' : 'var(--text-muted)',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'inbox' ? (
        <NotificationCenter
          notifications={notifications.notifications}
          loading={notifications.loading}
          error={notifications.error}
          onRefresh={() => notifications.refreshNotifications('all')}
          onMarkAsRead={notifications.markRead}
          onMarkAllAsRead={notifications.markAllRead}
          onNavigate={handleNavigate}
        />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <Card style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={18} />
              <span style={{ fontWeight: 800 }}>Email delivery attempts</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={deliveryStatus}
                onChange={(event) => setDeliveryStatus(event.target.value as NotificationDeliveryStatus | '')}
                style={{
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-h)',
                  padding: '0 10px',
                }}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="SKIPPED">Skipped</option>
              </select>
              <Button variant="subtle" size="sm" iconLeft={<RefreshCw size={14} />} onClick={() => void loadDeliveries()} loading={deliveryLoading}>
                Refresh
              </Button>
            </div>
          </Card>

          {deliveryError ? (
            <Alert variant="error" title="Delivery log unavailable">{deliveryError}</Alert>
          ) : deliveries.length === 0 ? (
            <Alert variant="info" title="No delivery attempts">No email delivery attempts match this filter.</Alert>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Notification</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell>Failure</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <strong>{delivery.title}</strong>
                        <br />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{delivery.domain} / {delivery.type}</span>
                      </TableCell>
                      <TableCell style={{ fontSize: 12 }}>{delivery.recipientEmail}</TableCell>
                      <TableCell><Chip color={statusColor(delivery.status)}>{delivery.status}</Chip></TableCell>
                      <TableCell>{delivery.attemptCount}</TableCell>
                      <TableCell style={{ fontSize: 12 }}>{formatTime(delivery.sentAt)}</TableCell>
                      <TableCell style={{ fontSize: 12, color: 'var(--text-muted)' }}>{delivery.failureReason ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
