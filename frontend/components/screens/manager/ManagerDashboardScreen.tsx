'use client';

import React from 'react';
import { AlertTriangle, BarChart2, CheckCircle2, Clock, Inbox, SquarePen } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { TicketCard, TicketsSectionSkeleton } from '@/components/tickets';
import { Alert, Button, Card, Chip, Skeleton } from '@/components/ui';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketCategory, TicketPriority, TicketSummaryResponse } from '@/lib/api-types';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ELECTRICAL: 'Electrical',
  NETWORK: 'Network',
  EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture',
  CLEANLINESS: 'Cleanliness',
  FACILITY_DAMAGE: 'Facility Damage',
  ACCESS_SECURITY: 'Access / Security',
  OTHER: 'Other',
};

const PRIORITY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

function percent(value: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function CountCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <Card hoverable>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text-h)' }}>
            {value}
          </p>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
            {caption}
          </p>
        </div>
        <span style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--yellow-700)', flexShrink: 0 }}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
    </Card>
  );
}

function MeterRow({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
        <span style={{ color: 'var(--text-body)', fontWeight: 700 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value} ({percent(value, total)})</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div
          style={{
            width: percent(value, total),
            height: '100%',
            borderRadius: 999,
            background: 'var(--yellow-400)',
            boxShadow: '0 2px 10px rgba(238,202,68,.25)',
          }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, caption, onViewAll }: { title: string; caption: string; onViewAll: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
      <div>
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>{title}</p>
        <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>{caption}</p>
      </div>
      <button
        onClick={onViewAll}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--yellow-600)', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
      >
        View all →
      </button>
    </div>
  );
}

export function ManagerDashboardScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
        if (!cancelled) setTickets(list);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'We could not load your tickets.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [accessToken]);

  const counts = React.useMemo(() => ({
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    urgentActive: tickets.filter((t) => t.priority === 'URGENT' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')).length,
    completed: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
  }), [tickets]);

  const needsAttention = React.useMemo(() =>
    tickets
      .filter((t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status === 'OPEN')
      .slice(0, 4),
    [tickets]
  );

  const inProgressTickets = React.useMemo(() =>
    tickets.filter((t) => t.status === 'IN_PROGRESS').slice(0, 4),
    [tickets]
  );

  const total = tickets.length;

  const byPriority = React.useMemo(() =>
    PRIORITY_ORDER.map((p) => ({ label: PRIORITY_LABELS[p], value: tickets.filter((t) => t.priority === p).length })),
    [tickets]
  );

  const byCategory = React.useMemo(() => {
    const cats = Object.keys(CATEGORY_LABELS) as TicketCategory[];
    return cats
      .map((cat) => ({ label: CATEGORY_LABELS[cat], value: tickets.filter((t) => t.category === cat).length }))
      .filter((row) => row.value > 0);
  }, [tickets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Manager Workspace
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: 0, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Dashboard
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Your queue at a glance. Jump into tickets that need attention.
          </p>
        </div>
        <Chip color="yellow" dot>Ticket Queue</Chip>
      </div>

      {error && (
        <Alert variant="error" title="Could not load tickets">{error}</Alert>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={96} />
            ))}
          </div>
          <TicketsSectionSkeleton count={3} />
          <TicketsSectionSkeleton count={3} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <CountCard label="Open" value={counts.open} caption="Awaiting action" icon={Inbox} />
            <CountCard label="In Progress" value={counts.inProgress} caption="Currently being worked" icon={Clock} />
            <CountCard label="Urgent Active" value={counts.urgentActive} caption="Urgent open or in-progress" icon={AlertTriangle} />
            <CountCard label="Completed" value={counts.completed} caption="Resolved and closed" icon={CheckCircle2} />
          </div>

          <div>
            <SectionHeader
              title="Needs Attention"
              caption="Urgent and high priority open tickets."
              onViewAll={() => router.push('/ticket-managers/tickets?status=OPEN')}
            />
            {needsAttention.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No urgent or high priority open tickets right now.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {needsAttention.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    showReporter
                    onView={() => router.push(`/ticket-managers/tickets/${ticket.ticketCode}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader
              title="Currently In Progress"
              caption="Tickets you are actively working on."
              onViewAll={() => router.push('/ticket-managers/tickets?status=IN_PROGRESS')}
            />
            {inProgressTickets.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No tickets in progress right now.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {inProgressTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    showReporter
                    onView={() => router.push(`/ticket-managers/tickets/${ticket.ticketCode}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BarChart2 size={18} color="var(--yellow-600)" />
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  By Priority
                </p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {byPriority.map((row) => (
                  <MeterRow key={row.label} label={row.label} value={row.value} total={total} />
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BarChart2 size={18} color="var(--yellow-600)" />
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  By Category
                </p>
              </div>
              {byCategory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No ticket data yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {byCategory.map((row) => (
                    <MeterRow key={row.label} label={row.label} value={row.value} total={total} />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <SquarePen size={18} color="var(--yellow-600)" />
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  Reported Tickets
                </p>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
                Submit your own operational issues and follow them separately from the assigned work queue.
              </p>
              <div style={{ marginTop: 18 }}>
                <Button variant="subtle" size="sm" onClick={() => router.push('/ticket-managers/reported')}>
                  Open Reported Tickets
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
