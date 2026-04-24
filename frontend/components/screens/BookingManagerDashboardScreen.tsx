'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Input, Select, Skeleton } from '@/components/ui';
import { getBookingAnalytics, getErrorMessage, listResourceOptions } from '@/lib/api-client';
import type {
  BookingAnalyticsBreakdownRow,
  BookingAnalyticsBucket,
  BookingAnalyticsHeatmapCell,
  BookingAnalyticsQuery,
  BookingAnalyticsResponse,
  BookingAnalyticsTopResource,
  ResourceCategory,
  ResourceOption,
} from '@/lib/api-types';
import { getResourceCategoryLabel } from '@/lib/resource-display';

type DemandMode = 'resources' | 'categories';

type FilterState = {
  from: string;
  to: string;
  bucket: BookingAnalyticsBucket;
  category: string;
  resourceId: string;
};

const FLOW_COLORS = {
  scheduled: 'rgba(238,202,68,.72)',
  approved: 'rgba(20,164,87,.72)',
  attended: 'rgba(43,109,232,.92)',
  noShow: 'rgba(230,53,40,.9)',
  cancelled: 'rgba(126,131,145,.82)',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--yellow-400)',
  APPROVED: 'var(--green-400)',
  CHECKED_IN: 'var(--blue-400)',
  COMPLETED: 'var(--blue-600)',
  REJECTED: 'var(--red-400)',
  CANCELLED: 'var(--neutral-400)',
  NO_SHOW: 'var(--red-600)',
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultFilters(): FilterState {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 30);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(today),
    bucket: 'DAY',
    category: '',
    resourceId: '',
  };
}

const defaultFilters = createDefaultFilters();

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function buildAnalyticsQuery(filters: FilterState): BookingAnalyticsQuery {
  return {
    bucket: filters.bucket,
    ...(filters.from ? { from: startOfDate(filters.from) } : {}),
    ...(filters.to ? { to: endOfDate(filters.to) } : {}),
    ...(filters.category ? { category: filters.category as ResourceCategory } : {}),
    ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
  };
}

function formatRate(value: number | null | undefined) {
  if (value == null) {
    return 'n/a';
  }
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatHours(value: number | null | undefined) {
  if (value == null) {
    return '0h';
  }
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}h`;
}

function formatRangeLabel(analytics: BookingAnalyticsResponse | null) {
  if (!analytics) {
    return 'Live data';
  }

  return `${new Date(analytics.from).toLocaleDateString()} - ${new Date(analytics.to).toLocaleDateString()}`;
}

function formatBucketLabel(value: string, bucket: BookingAnalyticsBucket) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (bucket === 'MONTH') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  if (bucket === 'WEEK') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatHourLabel(hour: number) {
  return `${`${hour}`.padStart(2, '0')}:00`;
}

function getHeatColor(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) {
    return 'rgba(212, 212, 212, 0.22)';
  }

  const intensity = Math.max(0.18, value / maxValue);
  return `rgba(238, 202, 68, ${Math.min(0.96, intensity)})`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
        lineHeight: 1.7,
        padding: 24,
      }}
    >
      {message}
    </div>
  );
}

function KpiCard({
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text-h)' }}>
            {value}
          </p>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
            {caption}
          </p>
        </div>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(238,202,68,.14)',
            color: 'var(--yellow-700)',
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
            {title}
          </p>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  cta: string;
  onClick: () => void;
}) {
  return (
    <Card hoverable>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(238,202,68,.14)',
              color: 'var(--yellow-700)',
              flexShrink: 0,
            }}
          >
            <Icon size={18} strokeWidth={2.2} />
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
            {title}
          </div>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
          {description}
        </p>
        <div>
          <Button variant="subtle" size="sm" onClick={onClick}>
            {cta}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FlowTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--card-shadow)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-h)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {payload.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-body)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: entry.color ?? 'var(--text-muted)' }} />
              {entry.name}
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingFlowCard({
  analytics,
}: {
  analytics: BookingAnalyticsResponse;
}) {
  const data = analytics.trends.map((point) => ({
    label: formatBucketLabel(point.bucketStart, analytics.bucket),
    scheduled: point.scheduled,
    approved: point.approved,
    attended: point.attended,
    noShow: point.noShow,
    cancelled: point.cancelled,
  }));

  const hasData = data.some((point) => point.scheduled || point.attended || point.noShow || point.cancelled || point.approved);

  return (
    <ChartCard
      title="Booking Flow"
      subtitle="Scheduled demand across the selected window with approval, attendance, and no-show movement."
    >
      {!hasData ? (
        <EmptyState message="No bookings fall inside the current date range." />
      ) : (
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(130,130,130,.16)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<FlowTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="scheduled" name="Scheduled" fill={FLOW_COLORS.scheduled} radius={[8, 8, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill={FLOW_COLORS.cancelled} radius={[8, 8, 0, 0]} />
              <Line type="monotone" dataKey="approved" name="Approved" stroke={FLOW_COLORS.approved} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="attended" name="Attended" stroke={FLOW_COLORS.attended} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="noShow" name="No Show" stroke={FLOW_COLORS.noShow} strokeWidth={2.4} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function StatusMixCard({
  rows,
}: {
  rows: BookingAnalyticsBreakdownRow[];
}) {
  const data = rows.filter((row) => row.count > 0);

  return (
    <ChartCard
      title="Status Mix"
      subtitle="Current outcome distribution for bookings scheduled inside the selected range."
    >
      {data.length === 0 ? (
        <EmptyState message="No status distribution is available for the current filters." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 240px)', gap: 8, alignItems: 'center' }}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={72}
                  outerRadius={102}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? 'var(--yellow-400)'} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value, _name, entry) => [
                    `${value ?? 0}`,
                    ((entry?.payload as BookingAnalyticsBreakdownRow | undefined)?.label) ?? '',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {rows.map((row) => (
              <div key={row.key} style={{ display: 'grid', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-body)', fontWeight: 700 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS[row.key] ?? 'var(--yellow-400)' }} />
                    {row.label}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{row.count} ({row.percentage.toFixed(1)}%)</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, row.percentage)}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: STATUS_COLORS[row.key] ?? 'var(--yellow-400)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function PeakUsageCard({
  cells,
}: {
  cells: BookingAnalyticsHeatmapCell[];
}) {
  const heatmap = React.useMemo(() => {
    const map = new Map<string, BookingAnalyticsHeatmapCell>();
    cells.forEach((cell) => {
      map.set(`${cell.dayOfWeek}|${cell.hourOfDay}`, cell);
    });
    return map;
  }, [cells]);

  const maxHours = Math.max(0, ...cells.map((cell) => cell.hoursBooked));
  const totalBookings = cells.reduce((sum, cell) => sum + cell.bookingCount, 0);

  return (
    <ChartCard
      title="Peak Usage"
      subtitle="Weekly hour-of-day density based on local booking time. Darker cells mean more booked time."
    >
      {totalBookings === 0 ? (
        <EmptyState message="The current filters do not produce any booking-time overlap for the heatmap." />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(24, minmax(28px, 1fr))', gap: 6, minWidth: 880 }}>
              <div />
              {Array.from({ length: 24 }).map((_, hour) => (
                <div key={hour} style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {hour}
                </div>
              ))}
              {Object.entries(DAY_LABELS).map(([dayKey, label]) => (
                <React.Fragment key={dayKey}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-body)', display: 'flex', alignItems: 'center' }}>
                    {label}
                  </div>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const cell = heatmap.get(`${dayKey}|${hour}`);
                    const value = cell?.hoursBooked ?? 0;
                    const count = cell?.bookingCount ?? 0;

                    return (
                      <div
                        key={`${dayKey}-${hour}`}
                        title={`${label} ${formatHourLabel(hour)} - ${count} booking slot${count === 1 ? '' : 's'} - ${formatHours(value)}`}
                        style={{
                          height: 28,
                          borderRadius: 8,
                          background: getHeatColor(value, maxHours),
                          border: '1px solid rgba(130,130,130,.12)',
                          boxShadow: count > 0 ? 'inset 0 1px 0 rgba(255,255,255,.24)' : 'none',
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 12 }}>
              <span>Lower</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0.16, 0.34, 0.56, 0.78, 0.96].map((opacity) => (
                  <span
                    key={opacity}
                    style={{ width: 18, height: 10, borderRadius: 999, background: `rgba(238, 202, 68, ${opacity})` }}
                  />
                ))}
              </div>
              <span>Higher</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Peak cell: {formatHours(maxHours)}
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function DemandLeadersCard({
  mode,
  onModeChange,
  categories,
  resources,
}: {
  mode: DemandMode;
  onModeChange: (mode: DemandMode) => void;
  categories: BookingAnalyticsBreakdownRow[];
  resources: BookingAnalyticsTopResource[];
}) {
  const categoryData = categories.slice(0, 8).map((row) => ({
    label: row.label,
    count: row.count,
    detail: `${row.percentage.toFixed(1)}%`,
  }));

  const resourceData = resources.map((row) => ({
    label: row.name.length > 22 ? `${row.name.slice(0, 22)}...` : row.name,
    count: row.bookingCount,
    detail: `${formatHours(row.hoursBooked)} - ${row.noShowCount} no-show`,
  }));

  const data = mode === 'resources' ? resourceData : categoryData;

  return (
    <ChartCard
      title="Demand Leaders"
      subtitle="Switch between top resource categories and the busiest individual resources."
      action={(
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={mode === 'resources' ? 'primary' : 'subtle'} size="sm" onClick={() => onModeChange('resources')}>
            Resources
          </Button>
          <Button variant={mode === 'categories' ? 'primary' : 'subtle'} size="sm" onClick={() => onModeChange('categories')}>
            Categories
          </Button>
        </div>
      )}
    >
      {data.length === 0 ? (
        <EmptyState message="There is not enough demand data in the current filter scope." />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(130,130,130,.16)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: 'var(--text-body)' }} axisLine={false} tickLine={false} />
                <RechartsTooltip
                  formatter={(value, _name, entry) => [
                    `${value ?? 0}`,
                    ((entry?.payload as { detail?: string } | undefined)?.detail) ?? '',
                  ]}
                />
                <Bar dataKey="count" fill="var(--yellow-400)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(mode === 'resources' ? resources : categories.slice(0, 8)).map((item) => (
              <div key={mode === 'resources' ? (item as BookingAnalyticsTopResource).resourceId : (item as BookingAnalyticsBreakdownRow).key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-body)', fontWeight: 700 }}>
                  {mode === 'resources'
                    ? (item as BookingAnalyticsTopResource).name
                    : (item as BookingAnalyticsBreakdownRow).label}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {mode === 'resources'
                    ? `${(item as BookingAnalyticsTopResource).bookingCount} bookings - ${formatHours((item as BookingAnalyticsTopResource).hoursBooked)}`
                    : `${(item as BookingAnalyticsBreakdownRow).count} bookings`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Skeleton variant="rect" height={92} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} variant="rect" height={112} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <Skeleton variant="rect" height={360} />
        <Skeleton variant="rect" height={360} />
        <Skeleton variant="rect" height={360} />
        <Skeleton variant="rect" height={360} />
      </div>
    </div>
  );
}

export function BookingManagerDashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [filters, setFilters] = React.useState<FilterState>(defaultFilters);
  const [analytics, setAnalytics] = React.useState<BookingAnalyticsResponse | null>(null);
  const [resources, setResources] = React.useState<ResourceOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [resourcesLoading, setResourcesLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [demandMode, setDemandMode] = React.useState<DemandMode>('resources');

  React.useEffect(() => {
    if (!accessToken) {
      setResourcesLoading(false);
      return;
    }

    let cancelled = false;
    const token = accessToken;
    async function loadResources() {
      setResourcesLoading(true);
      try {
        const nextResources = await listResourceOptions(token, { status: 'ACTIVE', bookable: true });
        if (!cancelled) {
          setResources(nextResources);
        }
      } catch {
        if (!cancelled) {
          setResources([]);
        }
      } finally {
        if (!cancelled) {
          setResourcesLoading(false);
        }
      }
    }

    void loadResources();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError('Your session is unavailable. Please sign in again.');
      return;
    }

    let cancelled = false;
    const token = accessToken;
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const nextAnalytics = await getBookingAnalytics(token, buildAnalyticsQuery(filters));
        if (!cancelled) {
          setAnalytics(nextAnalytics);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAnalytics(null);
          setError(getErrorMessage(loadError, 'We could not load booking analytics.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [accessToken, filters]);

  const categoryOptions = React.useMemo(
    () => Array.from(new Set(resources.map((resource) => resource.category)))
      .sort()
      .map((category) => ({ value: category, label: getResourceCategoryLabel(category) })),
    [resources],
  );

  const resourceOptions = React.useMemo(
    () => resources
      .filter((resource) => !filters.category || resource.category === filters.category)
      .map((resource) => ({ value: resource.id, label: `${resource.name} (${resource.code})` })),
    [filters.category, resources],
  );

  React.useEffect(() => {
    if (filters.resourceId && !resourceOptions.some((resource) => resource.value === filters.resourceId)) {
      setFilters((current) => ({ ...current, resourceId: '' }));
    }
  }, [filters.resourceId, resourceOptions]);

  const kpis = analytics ? [
    {
      label: 'Pending Approvals',
      value: analytics.liveQueue.pendingApprovals,
      caption: 'Current booking requests awaiting a manager decision.',
      icon: CalendarClock,
    },
    {
      label: 'Stale Pending',
      value: analytics.liveQueue.stalePendingApprovals,
      caption: 'Pending requests that have been idle for more than 24 hours.',
      icon: AlertTriangle,
    },
    {
      label: 'Pending Mods',
      value: analytics.liveQueue.pendingModifications,
      caption: 'Requested booking changes still waiting for review.',
      icon: ClipboardList,
    },
    {
      label: 'Approval Rate',
      value: formatRate(analytics.windowSummary.approvalRate),
      caption: `${analytics.windowSummary.approved} approved vs ${analytics.windowSummary.rejected} rejected`,
      icon: CheckCircle2,
    },
    {
      label: 'Attendance Rate',
      value: formatRate(analytics.windowSummary.attendanceRate),
      caption: `${analytics.windowSummary.attended} attended bookings inside this range`,
      icon: UserCheck,
    },
    {
      label: 'No-Show Rate',
      value: formatRate(analytics.windowSummary.noShowRate),
      caption: `${analytics.windowSummary.noShow} no-show outcomes - ${formatHours(analytics.windowSummary.hoursBooked)} booked`,
      icon: Activity,
    },
  ] : [];

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Manager Workspace
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Booking Manager Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 760, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Track queue pressure, demand patterns, attendance outcomes, and busiest resources without leaving the booking workspace.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
          <Chip color="green" dot>Booking Manager</Chip>
          <Chip color="yellow" dot>{formatRangeLabel(analytics)}</Chip>
        </div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, alignItems: 'end' }}>
          <Input
            label="From"
            type="date"
            value={filters.from}
            disabled={loading}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
          />
          <Input
            label="To"
            type="date"
            value={filters.to}
            disabled={loading}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
          />
          <Select
            label="Bucket"
            value={filters.bucket}
            disabled={loading}
            options={[
              { value: 'DAY', label: 'Day' },
              { value: 'WEEK', label: 'Week' },
              { value: 'MONTH', label: 'Month' },
            ]}
            onChange={(event) => setFilters((current) => ({ ...current, bucket: event.target.value as BookingAnalyticsBucket }))}
          />
          <Select
            label="Category"
            value={filters.category}
            disabled={loading || resourcesLoading}
            placeholder="All categories"
            options={categoryOptions}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value, resourceId: '' }))}
          />
          <Select
            label="Resource"
            value={filters.resourceId}
            disabled={loading || resourcesLoading}
            placeholder="All resources"
            options={resourceOptions}
            onChange={(event) => setFilters((current) => ({ ...current, resourceId: event.target.value }))}
          />
          <Button
            type="button"
            variant="subtle"
            size="md"
            disabled={loading}
            iconLeft={<RotateCcw size={14} />}
            onClick={() => setFilters(defaultFilters)}
          >
            Reset
          </Button>
        </div>
      </Card>

      {error && <Alert variant="error" title="Analytics unavailable">{error}</Alert>}

      {loading ? (
        <DashboardSkeleton />
      ) : analytics ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} caption={kpi.caption} icon={kpi.icon} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            <BookingFlowCard analytics={analytics} />
            <StatusMixCard rows={analytics.statusBreakdown} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            <PeakUsageCard cells={analytics.utilizationHeatmap} />
            <DemandLeadersCard
              mode={demandMode}
              onModeChange={setDemandMode}
              categories={analytics.categoryBreakdown}
              resources={analytics.topResources}
            />
          </div>
        </>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        <ActionCard
          title="Booking Queue"
          description="Open the booking operations screen for approvals, modifications, and check-in management."
          icon={CalendarClock}
          cta="Open Bookings"
          onClick={() => router.push('/booking-managers/bookings')}
        />
        <ActionCard
          title="Support Tickets"
          description="Create and track booking-related support tickets using the shared requester ticket experience."
          icon={MessageSquareText}
          cta="Open Tickets"
          onClick={() => router.push('/booking-managers/tickets')}
        />
        <ActionCard
          title="Operational Focus"
          description="Use tickets for incidents and defects, while leaving approvals and scheduling decisions in the booking queue."
          icon={ClipboardList}
          cta="View Booking Workflow"
          onClick={() => router.push('/booking-managers/bookings')}
        />
      </div>
    </div>
  );
}
