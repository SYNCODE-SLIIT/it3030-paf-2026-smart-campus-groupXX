'use client';

import React from 'react';
import { BarChart2, CheckCircle2, Clock, Tag, XCircle } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Card, Chip, Skeleton } from '@/components/ui';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketCategory, TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

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

const STATUS_ORDER: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
const STATUS_DISPLAY: Record<TicketStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected',
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
  value: string | number;
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

export function ManagerAnalyticsScreen() {
  const { session } = useAuth();
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
        if (!cancelled) setError(getErrorMessage(err, 'We could not load analytics data.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [accessToken]);

  const total = tickets.length;
  const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;
  const rejected = tickets.filter((t) => t.status === 'REJECTED').length;
  const rejectionRate = total === 0 ? 0 : Math.round((rejected / total) * 100);

  // Average age of active (OPEN + IN_PROGRESS) tickets in days
  const activeTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const avgActiveDays = activeTickets.length === 0 ? 0 : Math.round(
    activeTickets.reduce((sum, t) => sum + (Date.now() - new Date(t.createdAt).getTime()), 0)
    / activeTickets.length
    / 86_400_000
  );

  const byStatus = React.useMemo(() =>
    STATUS_ORDER.map((s) => ({ label: STATUS_DISPLAY[s], value: tickets.filter((t) => t.status === s).length })),
    [tickets]
  );

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Insights
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Analytics
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Ticket volume, priority breakdown, and category distribution across your queue.
          </p>
        </div>
        <Chip color="yellow" dot>Live Data</Chip>
      </div>

      {error && <Alert variant="error" title="Analytics unavailable">{error}</Alert>}

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton variant="rect" height={96} />
          <Skeleton variant="rect" height={260} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <CountCard label="Total Handled" value={total} caption="All assigned tickets" icon={Tag} />
            <CountCard label="Resolved" value={resolved} caption={`${percent(resolved, total)} resolution rate`} icon={CheckCircle2} />
            {/* NOTE: True avg resolution time requires resolvedAt on TicketSummaryResponse (extend the DTO to enable). */}
            <CountCard label="Avg Active Age" value={`${avgActiveDays}d`} caption="Days — open and in-progress" icon={Clock} />
            <CountCard label="Rejection Rate" value={`${rejectionRate}%`} caption={`${rejected} rejected tickets`} icon={XCircle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BarChart2 size={18} color="var(--yellow-600)" />
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  By Status
                </p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {byStatus.map((row) => (
                  <MeterRow key={row.label} label={row.label} value={row.value} total={total} />
                ))}
              </div>
            </Card>

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
          </div>
        </>
      )}
    </div>
  );
}
