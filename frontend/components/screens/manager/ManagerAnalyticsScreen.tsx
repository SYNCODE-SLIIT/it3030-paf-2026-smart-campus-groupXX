'use client';

import React from 'react';
import { Activity, AlertTriangle, BarChart2, CheckCircle2, Clock, MessageSquare, Paperclip, RotateCcw, Tag, XCircle } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Input, Select, Skeleton } from '@/components/ui';
import { getErrorMessage, getTicketAnalytics } from '@/lib/api-client';
import type {
  TicketAnalyticsAttentionTicket,
  TicketAnalyticsBreakdownRow,
  TicketAnalyticsBucket,
  TicketAnalyticsQuery,
  TicketAnalyticsResponse,
  TicketAnalyticsSla,
  TicketAnalyticsStatusEvent,
  TicketPriority,
} from '@/lib/api-types';
import { formatSlaMinutes } from '@/lib/sla';

type AnalyticsFilterState = {
  from: string;
  to: string;
  bucket: TicketAnalyticsBucket;
};

const defaultFilters: AnalyticsFilterState = {
  from: '',
  to: '',
  bucket: 'DAY',
};

const bucketOptions = [
  { value: 'DAY', label: 'Day' },
  { value: 'WEEK', label: 'Week' },
  { value: 'MONTH', label: 'Month' },
];

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function buildAnalyticsQuery(filters: AnalyticsFilterState): TicketAnalyticsQuery {
  return {
    bucket: filters.bucket,
    ...(filters.from ? { from: startOfDate(filters.from) } : {}),
    ...(filters.to ? { to: endOfDate(filters.to) } : {}),
  };
}

function formatMinutes(value: number | null) {
  if (value === null) return 'n/a';
  if (value < 60) return `${Math.round(value)}m`;
  const hours = value / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)}d`;
}

function formatRate(value: number | null) {
  if (value === null) return 'n/a';
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function MeterRow({ row }: { row: TicketAnalyticsBreakdownRow }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
        <span style={{ color: 'var(--text-body)', fontWeight: 700 }}>{row.label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{row.count} ({row.percentage.toFixed(1)}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, row.percentage)}%`,
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

function BreakdownCard({ title, rows }: { title: string; rows: TicketAnalyticsBreakdownRow[] }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <BarChart2 size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          {title}
        </p>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {rows.map((row) => (
          <MeterRow key={row.key} row={row} />
        ))}
      </div>
    </Card>
  );
}

function TrendCard({ analytics }: { analytics: TicketAnalyticsResponse }) {
  const visible = analytics.trends.slice(-8);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Activity size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          Ticket Movement
        </p>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {visible.map((point) => (
          <div
            key={point.bucketStart}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(86px, 1fr) repeat(4, minmax(42px, auto))',
              gap: 10,
              alignItems: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ color: 'var(--text-body)', fontWeight: 800 }}>
              {new Date(point.bucketStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <span>New {point.created}</span>
            <span>Done {point.resolved}</span>
            <span>Reject {point.rejected}</span>
            <span>Backlog {point.activeBacklog}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AttentionCard({ tickets }: { tickets: TicketAnalyticsAttentionTicket[] }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <AlertTriangle size={18} color="var(--orange-400)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          Needs Attention
        </p>
      </div>
      {tickets.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No active tickets are over the attention threshold.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {tickets.map((ticket) => (
            <div key={ticket.id} style={{ display: 'grid', gap: 4, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontWeight: 900, color: 'var(--text-h)' }}>{ticket.ticketCode}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{ticket.priority}</span>
              </div>
              <span style={{ color: 'var(--text-body)', fontSize: 13, fontWeight: 700 }}>{ticket.title}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ticket.reason}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentEventsCard({ events }: { events: TicketAnalyticsStatusEvent[] }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Clock size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          Recent Status History
        </p>
      </div>
      {events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No status changes in this period.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {events.map((event) => (
            <div key={event.id} style={{ display: 'grid', gap: 3, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontWeight: 900, color: 'var(--text-h)' }}>{event.ticketCode}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatDateTime(event.changedAt)}</span>
              </div>
              <span style={{ color: 'var(--text-body)', fontSize: 13 }}>
                {event.oldStatus ?? 'NEW'} to {event.newStatus}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{event.changedByEmail}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const PRIORITY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const PRIORITY_LABEL: Record<TicketPriority, string> = { URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PRIORITY_COLOR: Record<TicketPriority, string> = { URGENT: 'var(--red-500)', HIGH: 'var(--orange-500)', MEDIUM: 'var(--blue-500)', LOW: 'var(--neutral-500)' };

function SlaComplianceCard({ sla }: { sla: TicketAnalyticsSla }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Clock size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          SLA Compliance
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Time to First Response
          </p>
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--text-h)' }}>
            {sla.overallTtfrComplianceRate != null ? `${sla.overallTtfrComplianceRate.toFixed(1)}%` : 'n/a'}
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {PRIORITY_ORDER.map((p) => {
              const row = sla.ttfrCompliance.find((r) => r.priority === p);
              if (!row) return null;
              return (
                <div key={p} style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5 }}>
                    <span style={{ fontWeight: 700, color: PRIORITY_COLOR[p] }}>{PRIORITY_LABEL[p]}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {row.total === 0 ? 'n/a' : `${row.complianceRate?.toFixed(1)}%`}
                      {row.total > 0 && <span style={{ fontSize: 10, marginLeft: 4 }}>target {formatSlaMinutes(row.targetMinutes)}</span>}
                    </span>
                  </div>
                  {row.total > 0 && (
                    <div style={{ height: 5, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, row.complianceRate ?? 0)}%`, height: '100%', borderRadius: 999, background: PRIORITY_COLOR[p] }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Time to Resolution
          </p>
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--text-h)' }}>
            {sla.overallTtrComplianceRate != null ? `${sla.overallTtrComplianceRate.toFixed(1)}%` : 'n/a'}
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {PRIORITY_ORDER.map((p) => {
              const row = sla.ttrCompliance.find((r) => r.priority === p);
              if (!row) return null;
              return (
                <div key={p} style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5 }}>
                    <span style={{ fontWeight: 700, color: PRIORITY_COLOR[p] }}>{PRIORITY_LABEL[p]}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {row.total === 0 ? 'n/a' : `${row.complianceRate?.toFixed(1)}%`}
                      {row.total > 0 && <span style={{ fontSize: 10, marginLeft: 4 }}>target {formatSlaMinutes(row.targetMinutes)}</span>}
                    </span>
                  </div>
                  {row.total > 0 && (
                    <div style={{ height: 5, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, row.complianceRate ?? 0)}%`, height: '100%', borderRadius: 999, background: PRIORITY_COLOR[p] }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AnalyticsControls({
  filters,
  loading,
  onChange,
}: {
  filters: AnalyticsFilterState;
  loading: boolean;
  onChange: (filters: AnalyticsFilterState) => void;
}) {
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, alignItems: 'end' }}>
        <Input
          label="From"
          type="date"
          value={filters.from}
          disabled={loading}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
        <Input
          label="To"
          type="date"
          value={filters.to}
          disabled={loading}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
        <Select
          label="Bucket"
          value={filters.bucket}
          disabled={loading}
          options={bucketOptions}
          onChange={(event) => onChange({ ...filters, bucket: event.target.value as TicketAnalyticsBucket })}
        />
        <Button
          type="button"
          variant="subtle"
          size="md"
          disabled={loading}
          iconLeft={<RotateCcw size={14} />}
          onClick={() => onChange(defaultFilters)}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}

function AnalyticsContent({ analytics }: { analytics: TicketAnalyticsResponse }) {
  const rangeLabel = `${new Date(analytics.from).toLocaleDateString()} - ${new Date(analytics.to).toLocaleDateString()}`;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Chip color="yellow" dot>{rangeLabel}</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        <CountCard label="Active Assigned" value={analytics.summary.activeBacklog} caption="Open and in-progress" icon={Tag} />
        <CountCard label="Urgent Active" value={analytics.summary.urgentActive} caption="Urgent tickets still active" icon={AlertTriangle} />
        <CountCard label="Avg Active Age" value={formatMinutes(analytics.timing.averageActiveAgeMinutes)} caption="Current active tickets" icon={Clock} />
        <CountCard label="Avg Accept" value={formatMinutes(analytics.timing.averageTimeToAcceptMinutes)} caption="Created to in progress" icon={Activity} />
        <CountCard label="Avg Resolve" value={formatMinutes(analytics.timing.averageTimeToResolveMinutes)} caption="Created to resolved" icon={CheckCircle2} />
        <CountCard label="Resolution Rate" value={formatRate(analytics.summary.positiveResolutionRate)} caption="Resolved or closed outcomes" icon={CheckCircle2} />
        <CountCard label="Rejection Rate" value={formatRate(analytics.summary.rejectionRate)} caption={`${analytics.summary.rejected} rejected tickets`} icon={XCircle} />
        <CountCard label="Comments" value={analytics.communication.totalComments} caption={`${analytics.communication.averageCommentsPerTicket} per ticket`} icon={MessageSquare} />
        <CountCard label="Attachments" value={analytics.communication.totalAttachments} caption={`${analytics.communication.ticketsWithAttachments} tickets with files`} icon={Paperclip} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <BreakdownCard title="By Status" rows={analytics.statusBreakdown} />
        <BreakdownCard title="By Priority" rows={analytics.priorityBreakdown} />
        <BreakdownCard title="By Category" rows={analytics.categoryBreakdown} />
      </div>

      <SlaComplianceCard sla={analytics.sla} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <TrendCard analytics={analytics} />
        <AttentionCard tickets={analytics.attentionTickets} />
        <RecentEventsCard events={analytics.recentStatusEvents} />
      </div>
    </>
  );
}

export function ManagerAnalyticsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [analytics, setAnalytics] = React.useState<TicketAnalyticsResponse | null>(null);
  const [filters, setFilters] = React.useState<AnalyticsFilterState>(defaultFilters);
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
        const nextAnalytics = await getTicketAnalytics(token, buildAnalyticsQuery(filters));
        if (!cancelled) setAnalytics(nextAnalytics);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'We could not load analytics data.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [accessToken, filters]);

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
            Ticket volume, response timing, communication, and status movement across your assigned queue.
          </p>
        </div>
        <Chip color="yellow" dot>Live Data</Chip>
      </div>

      <AnalyticsControls filters={filters} loading={loading} onChange={setFilters} />

      {error && <Alert variant="error" title="Analytics unavailable">{error}</Alert>}

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton variant="rect" height={96} />
          <Skeleton variant="rect" height={260} />
        </div>
      ) : analytics ? (
        <AnalyticsContent analytics={analytics} />
      ) : null}
    </div>
  );
}
