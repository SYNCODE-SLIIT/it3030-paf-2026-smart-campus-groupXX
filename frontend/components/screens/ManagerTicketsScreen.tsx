'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Input, Select, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs } from '@/components/ui';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketCategory, TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type StatusFilter = TicketStatus | 'ALL';
type PriorityFilter = TicketPriority | 'ALL';
type CategoryFilter = TicketCategory | 'ALL';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
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

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ELECTRICAL: 'Electrical', NETWORK: 'Network', EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture', CLEANLINESS: 'Cleanliness', FACILITY_DAMAGE: 'Facility Damage',
  ACCESS_SECURITY: 'Access / Security', OTHER: 'Other',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};

const PRIORITY_CHIP_COLOR: Record<TicketPriority, 'red' | 'orange' | 'blue' | 'neutral'> = {
  URGENT: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'neutral',
};

const STATUS_CHIP_COLOR: Record<TicketStatus, 'green' | 'neutral' | 'red' | 'blue' | 'yellow'> = {
  OPEN: 'blue', IN_PROGRESS: 'yellow', RESOLVED: 'green', CLOSED: 'neutral', REJECTED: 'red',
};

const STATUS_DISPLAY: Record<TicketStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected',
};

const DATE_FMT = new Intl.DateTimeFormat('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
function formatDate(iso: string) {
  return DATE_FMT.format(new Date(iso));
}

function ManagerTicketsScreenInner() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = session?.access_token ?? null;

  const initialStatus = (searchParams.get('status') as StatusFilter) ?? 'ALL';

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatus);
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>('ALL');
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
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
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
  }, [tickets, statusFilter, priorityFilter, categoryFilter, searchQuery]);

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
          <div style={{ flex: '0 0 160px', minWidth: 0 }}>
            <Select
              id="priority-filter"
              value={priorityFilter}
              options={PRIORITY_OPTIONS}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            />
          </div>
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
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Code</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', margin: 0, fontSize: 13 }}>
                          {tickets.length === 0 ? 'No tickets assigned to you yet.' : 'No tickets match your filters.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {ticket.ticketCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: 13 }}>
                            {ticket.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip color="neutral" size="sm">{CATEGORY_LABELS[ticket.category]}</Chip>
                        </TableCell>
                        <TableCell>
                          <Chip color={PRIORITY_CHIP_COLOR[ticket.priority]} size="sm" dot>
                            {PRIORITY_LABELS[ticket.priority]}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <Chip color={STATUS_CHIP_COLOR[ticket.status]} size="sm" dot>
                            {STATUS_DISPLAY[ticket.status]}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatDate(ticket.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => { router.push(`/ticket-managers/tickets/${ticket.ticketCode}`); }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
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
