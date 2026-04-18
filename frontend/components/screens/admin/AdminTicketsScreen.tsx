'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Tabs } from '@/components/ui';
import { TicketCard } from '@/components/tickets';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

type StatusFilter = TicketStatus | 'ALL';
type QueueFilter = 'all' | 'mine';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export function AdminTicketsScreen() {
  const { session, appUser } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>('all');
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listMyTickets(accessToken);
      setTickets(list);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load tickets.'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const queueFiltered = React.useMemo(() => {
    if (queueFilter === 'mine' && appUser) {
      return tickets.filter((t) => t.assignedToId === appUser.id);
    }
    return tickets;
  }, [tickets, queueFilter, appUser]);

  const tabCounts = React.useMemo(() => {
    const base = queueFiltered;
    return {
      ALL: base.length,
      OPEN: base.filter((t) => t.status === 'OPEN').length,
      IN_PROGRESS: base.filter((t) => t.status === 'IN_PROGRESS').length,
      RESOLVED: base.filter((t) => t.status === 'RESOLVED').length,
      CLOSED: base.filter((t) => t.status === 'CLOSED').length,
      REJECTED: base.filter((t) => t.status === 'REJECTED').length,
    } satisfies Record<StatusFilter, number>;
  }, [queueFiltered]);

  const filtered = statusFilter === 'ALL' ? queueFiltered : queueFiltered.filter((t) => t.status === statusFilter);

  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.32em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Admin Console
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Ticket Management
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            View all campus support tickets and assign them to ticket managers.
          </p>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Total
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {totalCount}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Open
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {openCount}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            In Progress
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {inProgressCount}
          </p>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tabs
            variant="pill"
            tabs={[
              { label: 'All Tickets', value: 'all', badge: tickets.length },
              { label: 'My Queue', value: 'mine', badge: appUser ? tickets.filter((t) => t.assignedToId === appUser.id).length : 0 },
            ]}
            value={queueFilter}
            onChange={(v) => setQueueFilter(v as QueueFilter)}
          />
        </div>

        <Tabs
          variant="pill"
          tabs={STATUS_TABS.map((tab) => ({ ...tab, badge: tabCounts[tab.value] }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        {loadError && (
          <Alert variant="error" title="Load failed">
            {loadError}
          </Alert>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
            {statusFilter === 'ALL'
              ? (queueFilter === 'mine' ? 'No tickets assigned to you.' : 'No tickets found.')
              : `No ${statusFilter.toLowerCase().replace('_', ' ')} tickets.`}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              showReporter
              onView={() => { router.push(`/admin/tickets/${ticket.id}`); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
