'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Input, Select, Skeleton, Tabs } from '@/components/ui';
import { TicketCard } from '@/components/tickets';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketCategory, TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type StatusFilter = TicketStatus | 'ALL';
type CategoryFilter = TicketCategory | 'ALL';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'CLEANLINESS', label: 'Cleanliness' },
  { value: 'FACILITY_DAMAGE', label: 'Facility Damage' },
  { value: 'ACCESS_SECURITY', label: 'Access / Security' },
  { value: 'OTHER', label: 'Other' },
];

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

function ManagerTicketsScreenInner() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = session?.access_token ?? null;

  const initialStatus = (searchParams.get('status') as StatusFilter) ?? 'ALL';

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatus);
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
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

  const filtered = React.useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.ticketCode.toLowerCase().includes(q) ||
          t.reportedByEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, searchQuery]);

  const priorityGroups = React.useMemo(() =>
    PRIORITY_ORDER
      .map((priority) => ({
        priority,
        tickets: filtered.filter((t) => t.priority === priority),
      }))
      .filter((g) => g.tickets.length > 0),
  [filtered]);

  const handleView = React.useCallback(
    (code: string) => { router.push(`/ticket-managers/tickets/${code}`); },
    [router],
  );

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Tabs
          variant="pill"
          tabs={STATUS_TABS.map((tab) => ({ ...tab, badge: tabCounts[tab.value] }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 180px', minWidth: 0 }}>
            <Select
              id="category-filter"
              value={categoryFilter}
              options={CATEGORY_OPTIONS}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            />
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 160 }}>
            <Input
              id="search"
              placeholder="Search by title, code, or reporter…"
              value={searchQuery}
              iconLeft={<Search size={14} />}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loadError && <Alert variant="error" title="Load failed">{loadError}</Alert>}

        {loading ? (
          <Skeleton variant="rect" height={320} />
        ) : priorityGroups.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
            {tickets.length === 0 ? 'No tickets assigned to you yet.' : 'No tickets match your filters.'}
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
    </div>
  );
}

export function ManagerTicketsScreen() {
  return (
    <React.Suspense fallback={<Skeleton variant="rect" height={60} />}>
      <ManagerTicketsScreenInner />
    </React.Suspense>
  );
}
