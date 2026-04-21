'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Chip, Skeleton, Tabs } from '@/components/ui';
import { TicketCard } from '@/components/tickets';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type CompletedTab = 'RESOLVED' | 'CLOSED' | 'REJECTED';

const PRIORITY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  URGENT: 'var(--red-400)',
  HIGH: 'var(--orange-400)',
  MEDIUM: 'var(--blue-400)',
  LOW: 'var(--neutral-400)',
};

interface SectionProps {
  label: string;
  color: string;
  tickets: TicketSummaryResponse[];
  onView: (code: string) => void;
}

function TicketSection({ label, color, tickets, onView }: SectionProps) {
  if (tickets.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', opacity: 0.55 }}>
          {tickets.length}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          padding: '18px 24px 36px',
          margin: '-18px -24px -24px',
          scrollPaddingInline: 24,
          scrollbarWidth: 'thin',
        }}
      >
        {tickets.map((ticket) => (
          <div key={ticket.id} style={{ minWidth: 320, maxWidth: 340, flexShrink: 0 }}>
            <TicketCard
              ticket={ticket}
              showReporter
              onView={() => onView(ticket.ticketCode)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ManagerCompletedScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<CompletedTab>('RESOLVED');

  React.useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError('Your session is unavailable. Please sign in again.');
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await listMyTickets(token);
        if (!cancelled) setTickets(list.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'REJECTED'));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'We could not load completed tickets.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [accessToken]);

  const resolved = tickets.filter((t) => t.status === 'RESOLVED');
  const closed = tickets.filter((t) => t.status === 'CLOSED');
  const rejected = tickets.filter((t) => t.status === 'REJECTED');

  const visible = activeTab === 'RESOLVED' ? resolved : activeTab === 'CLOSED' ? closed : rejected;

  const COMPLETED_TABS = [
    { label: 'Resolved', value: 'RESOLVED' as const, badge: resolved.length },
    { label: 'Closed', value: 'CLOSED' as const, badge: closed.length },
    { label: 'Rejected', value: 'REJECTED' as const, badge: rejected.length },
  ];

  const handleView = React.useCallback(
    (code: string) => { router.push(`/ticket-managers/tickets/${code}`); },
    [router],
  );

  const priorityGroups = React.useMemo(() =>
    PRIORITY_ORDER
      .map((priority) => ({
        priority,
        tickets: visible.filter((t) => t.priority === priority),
      }))
      .filter((g) => g.tickets.length > 0),
  [visible]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Ticket Archive
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Completed
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Resolved, closed, and rejected tickets.
          </p>
        </div>
        <Chip color="neutral" dot>Read-only</Chip>
      </div>

      {error && <Alert variant="error" title="Load failed">{error}</Alert>}

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={320} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Tabs
            variant="pill"
            tabs={COMPLETED_TABS}
            value={activeTab}
            onChange={(v) => setActiveTab(v as CompletedTab)}
          />

          {priorityGroups.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
              No {activeTab.toLowerCase()} tickets yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              {priorityGroups.map(({ priority, tickets: t }) => (
                <TicketSection
                  key={priority}
                  label={PRIORITY_LABELS[priority]}
                  color={PRIORITY_COLOR[priority]}
                  tickets={t}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
