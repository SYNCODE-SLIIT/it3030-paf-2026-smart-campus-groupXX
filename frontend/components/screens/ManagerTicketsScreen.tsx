'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Card, Tabs } from '@/components/ui';
import { TicketCard } from '@/components/tickets';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type StatusFilter = TicketStatus | 'ALL';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export function ManagerTicketsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!accessToken) { setLoading(false); setLoadError('Your session is unavailable.'); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listMyTickets(accessToken);
      setTickets(list);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load your tickets.'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => { void reload(); }, [reload]);

  const tabCounts = React.useMemo(() => ({
    ALL: tickets.length,
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
    REJECTED: tickets.filter((t) => t.status === 'REJECTED').length,
  } satisfies Record<StatusFilter, number>), [tickets]);

  const filtered = statusFilter === 'ALL' ? tickets : tickets.filter((t) => t.status === statusFilter);

  const inProgressCount = tabCounts.IN_PROGRESS;
  const resolvedCount = tabCounts.RESOLVED;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Manager Workspace
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
          My Tickets
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Tickets assigned to you. Accept, work through, and resolve them.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Assigned
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {tickets.length}
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
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Resolved
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {resolvedCount}
          </p>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Tabs
          variant="pill"
          tabs={STATUS_TABS.map((tab) => ({ ...tab, badge: tabCounts[tab.value] }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        {loadError && <Alert variant="error" title="Load failed">{loadError}</Alert>}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
            {statusFilter === 'ALL' ? 'No tickets assigned to you yet.' : `No ${statusFilter.toLowerCase().replace('_', ' ')} tickets.`}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 330px)', gap: 16 }}>
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              showReporter
              onView={() => { router.push(`/managers/tickets/${ticket.ticketCode}`); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
