'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Tag,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Input, Select, Skeleton, Tabs } from '@/components/ui';
import { getErrorMessage, getTicketAnalytics, listUsers } from '@/lib/api-client';
import type {
  AccountStatus,
  TicketAnalyticsAttentionTicket,
  TicketAnalyticsBreakdownRow,
  TicketAnalyticsBucket,
  TicketAnalyticsManagerPerformance,
  TicketAnalyticsQuery,
  TicketAnalyticsResponse,
  TicketAnalyticsSla,
  TicketAnalyticsStatusEvent,
  TicketCategory,
  TicketPriority,
  UserResponse,
  UserType,
} from '@/lib/api-types';
import { formatSlaMinutes } from '@/lib/sla';
import { getAccountStatusLabel, getUserDisplayName, getUserTypeLabel } from '@/lib/user-display';

type AnalyticsTab = 'tickets' | 'users';
type TicketAnalyticsScope = 'ALL' | 'UNASSIGNED' | string;

type TicketAnalyticsFilterState = {
  from: string;
  to: string;
  bucket: TicketAnalyticsBucket;
  scope: TicketAnalyticsScope;
  category: '' | TicketCategory;
  priority: '' | TicketPriority;
};

const roleOrder: UserType[] = ['STUDENT', 'FACULTY', 'MANAGER', 'ADMIN'];
const statusOrder: AccountStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED'];
const defaultTicketFilters: TicketAnalyticsFilterState = {
  from: '',
  to: '',
  bucket: 'DAY',
  scope: 'ALL',
  category: '',
  priority: '',
};

const bucketOptions = [
  { value: 'DAY', label: 'Day' },
  { value: 'WEEK', label: 'Week' },
  { value: 'MONTH', label: 'Month' },
];

const categoryOptions: Array<{ value: '' | TicketCategory; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'CLEANLINESS', label: 'Cleanliness' },
  { value: 'FACILITY_DAMAGE', label: 'Facility Damage' },
  { value: 'ACCESS_SECURITY', label: 'Access / Security' },
  { value: 'OTHER', label: 'Other' },
];

const priorityOptions: Array<{ value: '' | TicketPriority; label: string }> = [
  { value: '', label: 'All priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function buildTicketAnalyticsQuery(filters: TicketAnalyticsFilterState): TicketAnalyticsQuery {
  return {
    bucket: filters.bucket,
    ...(filters.from ? { from: startOfDate(filters.from) } : {}),
    ...(filters.to ? { to: endOfDate(filters.to) } : {}),
    ...(filters.scope === 'UNASSIGNED' ? { unassignedOnly: true } : {}),
    ...(filters.scope !== 'ALL' && filters.scope !== 'UNASSIGNED' ? { assigneeId: filters.scope } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
  };
}

function percent(value: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
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

function UserMeterRow({ label, value, total }: { label: string; value: number; total: number }) {
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

function TicketMeterRow({ row }: { row: TicketAnalyticsBreakdownRow }) {
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

function TicketBreakdownCard({ title, rows }: { title: string; rows: TicketAnalyticsBreakdownRow[] }) {
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
          <TicketMeterRow key={row.key} row={row} />
        ))}
      </div>
    </Card>
  );
}

function UserAnalyticsContent({ users }: { users: UserResponse[] }) {
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.accountStatus === 'ACTIVE').length;
  const pendingInvites = users.filter((user) => user.accountStatus === 'INVITED').length;
  const inviteSends = users.reduce((total, user) => total + user.inviteSendCount, 0);
  const students = users.filter((user) => user.userType === 'STUDENT');
  const completedStudents = students.filter((user) => user.studentProfile?.onboardingCompleted).length;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <CountCard label="Total Users" value={totalUsers} caption="Across all roles" icon={Users} />
        <CountCard label="Active Users" value={activeUsers} caption={`${percent(activeUsers, totalUsers)} active`} icon={Activity} />
        <CountCard label="Pending Invites" value={pendingInvites} caption="Awaiting access setup" icon={Clock} />
        <CountCard label="Invite Sends" value={inviteSends} caption="Generated access links" icon={UserPlus} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <BarChart2 size={18} color="var(--yellow-600)" />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
              Role Distribution
            </p>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {roleOrder.map((role) => (
              <UserMeterRow
                key={role}
                label={getUserTypeLabel(role)}
                value={users.filter((user) => user.userType === role).length}
                total={totalUsers}
              />
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <ShieldCheck size={18} color="var(--yellow-600)" />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
              Account Status
            </p>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {statusOrder.map((status) => (
              <UserMeterRow
                key={status}
                label={getAccountStatusLabel(status)}
                value={users.filter((user) => user.accountStatus === status).length}
                total={totalUsers}
              />
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Activity size={18} color="var(--yellow-600)" />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
              Student Onboarding
            </p>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <UserMeterRow label="Completed" value={completedStudents} total={students.length} />
            <UserMeterRow label="Pending" value={students.length - completedStudents} total={students.length} />
          </div>
        </Card>
      </div>
    </>
  );
}

const TREND_COLORS = { created: 'var(--blue-500)', resolved: '#22c55e', rejected: 'var(--red-500)' };

function TrendCard({ analytics }: { analytics: TicketAnalyticsResponse }) {
  const visible = analytics.trends.slice(-12);
  const maxVal = Math.max(1, ...visible.flatMap((p) => [p.created, p.resolved, p.rejected]));
  const H = 120;
  const BAR_W = 8;
  const GAP = 3;
  const GROUP = BAR_W * 3 + GAP * 4;
  const W = Math.max(360, visible.length * (GROUP + 8));

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={18} color="var(--yellow-600)" />
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>Ticket Movement</p>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
          {([['created', 'Created'], ['resolved', 'Resolved'], ['rejected', 'Rejected']] as const).map(([k, l]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: TREND_COLORS[k], display: 'inline-block' }} />{l}
            </span>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H + 28} style={{ display: 'block' }}>
          {visible.map((point, i) => {
            const x = i * (GROUP + 8) + 4;
            const label = new Date(point.bucketStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const vals = [point.created, point.resolved, point.rejected];
            const colors = [TREND_COLORS.created, TREND_COLORS.resolved, TREND_COLORS.rejected];
            return (
              <g key={point.bucketStart}>
                {vals.map((v, j) => {
                  const bh = Math.max(2, (v / maxVal) * H);
                  return (
                    <rect
                      key={j}
                      x={x + j * (BAR_W + GAP)}
                      y={H - bh}
                      width={BAR_W}
                      height={bh}
                      rx={2}
                      fill={colors[j]}
                      opacity={0.85}
                    />
                  );
                })}
                <text x={x + GROUP / 2 - GAP} y={H + 18} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}

const DONUT_STATUS_COLORS: Record<string, string> = {
  OPEN: 'var(--blue-500)',
  IN_PROGRESS: 'var(--yellow-500)',
  RESOLVED: '#22c55e',
  CLOSED: 'var(--neutral-500)',
  REJECTED: 'var(--red-500)',
};
const DONUT_PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'var(--red-500)',
  HIGH: 'var(--orange-500)',
  MEDIUM: 'var(--blue-500)',
  LOW: 'var(--neutral-500)',
};

function DonutChart({ rows, colorMap }: { rows: TicketAnalyticsBreakdownRow[]; colorMap: Record<string, string> }) {
  const total = rows.reduce((s, r) => s + Number(r.count), 0);
  const R = 52; const r = 32; const cx = 64; const cy = 64;
  let angle = -Math.PI / 2;
  const slices = rows.map((row) => {
    const frac = total === 0 ? 0 : Number(row.count) / total;
    const start = angle;
    angle += frac * 2 * Math.PI;
    return { row, frac, start, end: angle };
  });
  function arc(s: number, e: number) {
    if (e - s >= 2 * Math.PI - 0.001) e = s + 2 * Math.PI - 0.001;
    const x1 = cx + R * Math.cos(s); const y1 = cy + R * Math.sin(s);
    const x2 = cx + R * Math.cos(e); const y2 = cy + R * Math.sin(e);
    const ix1 = cx + r * Math.cos(e); const iy1 = cy + r * Math.sin(e);
    const ix2 = cx + r * Math.cos(s); const iy2 = cy + r * Math.sin(s);
    const large = e - s > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${r},${r} 0 ${large},0 ${ix2},${iy2} Z`;
  }
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={128} height={128} style={{ flexShrink: 0 }}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={R - r} />
        ) : slices.map(({ row, start, end }) => (
          <path key={row.key} d={arc(start, end)} fill={colorMap[row.key] ?? 'var(--surface-2)'} />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={800} fill="var(--text-h)">{total}</text>
      </svg>
      <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 140 }}>
        {rows.filter((r) => r.count > 0).map((row) => (
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorMap[row.key] ?? 'var(--surface-2)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-body)', flex: 1 }}>{row.label}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{row.count}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 36, textAlign: 'right' }}>{row.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutBreakdownCard({ title, rows, colorMap }: { title: string; rows: TicketAnalyticsBreakdownRow[]; colorMap: Record<string, string> }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <BarChart2 size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>{title}</p>
      </div>
      <DonutChart rows={rows} colorMap={colorMap} />
    </Card>
  );
}

const PRIORITY_PILL: Record<string, { bg: string; color: string }> = {
  URGENT: { bg: 'rgba(239,68,68,.15)', color: 'var(--red-500)' },
  HIGH:   { bg: 'rgba(249,115,22,.15)', color: 'var(--orange-500)' },
  MEDIUM: { bg: 'rgba(59,130,246,.15)', color: 'var(--blue-500)' },
  LOW:    { bg: 'var(--surface-2)', color: 'var(--text-muted)' },
};

function AttentionCard({ tickets }: { tickets: TicketAnalyticsAttentionTicket[] }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <AlertTriangle size={18} color="var(--orange-400)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>Needs Attention</p>
      </div>
      {tickets.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No active tickets are over the attention threshold.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tickets.map((ticket) => {
            const pill = PRIORITY_PILL[ticket.priority] ?? PRIORITY_PILL.LOW;
            return (
              <div key={ticket.id} style={{ display: 'grid', gap: 6, padding: '10px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-h)' }}>{ticket.ticketCode}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: pill.bg, color: pill.color }}>{ticket.priority}</span>
                </div>
                <span style={{ color: 'var(--text-body)', fontSize: 12.5, fontWeight: 600 }}>{ticket.title}</span>
                <span style={{ color: 'var(--orange-400)', fontSize: 11.5 }}>⚠ {ticket.reason}</span>
                {ticket.assignedToName && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Assigned: {ticket.assignedToName}</span>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const STATUS_PILL_STYLE: Record<string, { bg: string; color: string }> = {
  OPEN:        { bg: 'rgba(59,130,246,.15)',  color: 'var(--blue-500)' },
  IN_PROGRESS: { bg: 'rgba(234,179,8,.15)',   color: 'var(--yellow-600)' },
  RESOLVED:    { bg: 'rgba(34,197,94,.15)',   color: '#16a34a' },
  CLOSED:      { bg: 'var(--surface-2)',       color: 'var(--text-muted)' },
  REJECTED:    { bg: 'rgba(239,68,68,.15)',   color: 'var(--red-500)' },
};

function StatusPill({ status }: { status: string | null | undefined }) {
  const s = status ?? 'NEW';
  const style = STATUS_PILL_STYLE[s] ?? { bg: 'var(--surface-2)', color: 'var(--text-muted)' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {s.replace('_', ' ')}
    </span>
  );
}

function RecentEventsCard({ events }: { events: TicketAnalyticsStatusEvent[] }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Clock size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>Recent Status Changes</p>
      </div>
      {events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No status changes in this period.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {events.map((event) => (
            <div key={event.id} style={{ display: 'grid', gap: 6, padding: '10px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-h)' }}>{event.ticketCode ?? '—'}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatDateTime(event.changedAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusPill status={event.oldStatus ?? 'NEW'} />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
                <StatusPill status={event.newStatus} />
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{event.changedByEmail}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ManagerPerformanceCard({ rows }: { rows: TicketAnalyticsManagerPerformance[] }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Users size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          Manager Performance
        </p>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No assigned tickets in this view.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 760, display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(7, .7fr)', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <span>Assignee</span>
              <span>Total</span>
              <span>Active</span>
              <span>Urgent</span>
              <span>Done</span>
              <span>Reject</span>
              <span>Accept</span>
              <span>Resolve</span>
            </div>
            {rows.map((row) => (
              <div key={row.assigneeId} style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(7, .7fr)', gap: 10, alignItems: 'center', fontSize: 12.5, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-h)' }}>{row.assigneeName ?? row.assigneeEmail}</span>
                <span>{row.assignedTotal}</span>
                <span>{row.active}</span>
                <span>{row.urgentActive}</span>
                <span>{row.resolvedClosed}</span>
                <span>{row.rejected}</span>
                <span>{formatMinutes(row.averageTimeToAcceptMinutes)}</span>
                <span>{formatMinutes(row.averageTimeToResolveMinutes)}</span>
              </div>
            ))}
          </div>
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

function TicketAnalyticsControls({
  filters,
  loading,
  ticketManagers,
  onChange,
}: {
  filters: TicketAnalyticsFilterState;
  loading: boolean;
  ticketManagers: UserResponse[];
  onChange: (filters: TicketAnalyticsFilterState) => void;
}) {
  const scopeOptions = [
    { value: 'ALL', label: 'All tickets' },
    { value: 'UNASSIGNED', label: 'Unassigned open queue' },
    ...ticketManagers.map((manager) => ({
      value: manager.id,
      label: getUserDisplayName(manager),
    })),
  ];

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
        <Select
          label="Scope"
          value={filters.scope}
          disabled={loading}
          options={scopeOptions}
          onChange={(event) => onChange({ ...filters, scope: event.target.value })}
        />
        <Select
          label="Category"
          value={filters.category}
          disabled={loading}
          options={categoryOptions}
          onChange={(event) => onChange({ ...filters, category: event.target.value as '' | TicketCategory })}
        />
        <Select
          label="Priority"
          value={filters.priority}
          disabled={loading}
          options={priorityOptions}
          onChange={(event) => onChange({ ...filters, priority: event.target.value as '' | TicketPriority })}
        />
        <Button
          type="button"
          variant="subtle"
          size="md"
          disabled={loading}
          iconLeft={<RotateCcw size={14} />}
          onClick={() => onChange(defaultTicketFilters)}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}

function TicketAnalyticsContent({ analytics }: { analytics: TicketAnalyticsResponse }) {
  const rangeLabel = `${new Date(analytics.from).toLocaleDateString()} - ${new Date(analytics.to).toLocaleDateString()}`;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Chip color="yellow" dot>{rangeLabel}</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        <CountCard label="Active Backlog" value={analytics.summary.activeBacklog} caption="Open and in-progress" icon={Tag} />
        <CountCard label="Unassigned Open" value={analytics.summary.unassignedOpen} caption="Waiting for assignment" icon={AlertTriangle} />
        <CountCard label="Urgent Active" value={analytics.summary.urgentActive} caption="Urgent tickets still active" icon={AlertTriangle} />
        <CountCard label="Avg Assign" value={formatMinutes(analytics.timing.averageTimeToAssignMinutes)} caption={`${analytics.assignment.totalAssignmentEvents} assignment events`} icon={Users} />
        <CountCard label="Avg Accept" value={formatMinutes(analytics.timing.averageTimeToAcceptMinutes)} caption="Created to in progress" icon={Activity} />
        <CountCard label="Avg Resolve" value={formatMinutes(analytics.timing.averageTimeToResolveMinutes)} caption="Created to resolved" icon={CheckCircle2} />
        <CountCard label="Resolution Rate" value={formatRate(analytics.summary.positiveResolutionRate)} caption="Resolved or closed outcomes" icon={CheckCircle2} />
        <CountCard label="Rejection Rate" value={formatRate(analytics.summary.rejectionRate)} caption={`${analytics.summary.rejected} rejected tickets`} icon={XCircle} />
        <CountCard label="Comments" value={analytics.communication.totalComments} caption={`${analytics.communication.averageCommentsPerTicket} per ticket`} icon={MessageSquare} />
        <CountCard label="Attachments" value={analytics.communication.totalAttachments} caption={`${analytics.communication.ticketsWithAttachments} tickets with files`} icon={Paperclip} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <DonutBreakdownCard title="By Status" rows={analytics.statusBreakdown} colorMap={DONUT_STATUS_COLORS} />
        <DonutBreakdownCard title="By Priority" rows={analytics.priorityBreakdown} colorMap={DONUT_PRIORITY_COLORS} />
        <TicketBreakdownCard title="By Category" rows={analytics.categoryBreakdown} />
      </div>

      <TrendCard analytics={analytics} />

      <SlaComplianceCard sla={analytics.sla} />

      <ManagerPerformanceCard rows={analytics.managerPerformance} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <AttentionCard tickets={analytics.attentionTickets} />
        <RecentEventsCard events={analytics.recentStatusEvents} />
      </div>
    </>
  );
}

export function AdminAnalyticsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [ticketAnalytics, setTicketAnalytics] = React.useState<TicketAnalyticsResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState<AnalyticsTab>('tickets');
  const [ticketFilters, setTicketFilters] = React.useState<TicketAnalyticsFilterState>(defaultTicketFilters);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const [nextUsers, nextTicketAnalytics] = await Promise.all([
          listUsers(token),
          getTicketAnalytics(token, buildTicketAnalyticsQuery(ticketFilters)),
        ]);
        if (!cancelled) {
          setUsers(nextUsers);
          setTicketAnalytics(nextTicketAnalytics);
        }
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError, 'We could not load analytics.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [accessToken, ticketFilters]);

  const ticketManagers = users.filter((user) => user.userType === 'MANAGER' && user.managerRole === 'TICKET_MANAGER');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Insights
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: 0, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Analytics
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Campus ticket operations, manager workload, directory health, invites, and onboarding completion.
          </p>
        </div>
        <Chip color="yellow" dot>
          Live Data
        </Chip>
      </div>

      <Tabs
        variant="pill"
        tabs={[
          { label: 'Tickets', value: 'tickets' },
          { label: 'Users', value: 'users' },
        ]}
        value={activeTab}
        onChange={(value) => setActiveTab(value as AnalyticsTab)}
      />

      {activeTab === 'tickets' && (
        <TicketAnalyticsControls
          filters={ticketFilters}
          loading={loading}
          ticketManagers={ticketManagers}
          onChange={setTicketFilters}
        />
      )}

      {error && (
        <Alert variant="error" title="Analytics unavailable">
          {error}
        </Alert>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton variant="rect" height={96} />
          <Skeleton variant="rect" height={260} />
        </div>
      ) : activeTab === 'tickets' && ticketAnalytics ? (
        <TicketAnalyticsContent analytics={ticketAnalytics} />
      ) : activeTab === 'users' ? (
        <UserAnalyticsContent users={users} />
      ) : null}
    </div>
  );
}
