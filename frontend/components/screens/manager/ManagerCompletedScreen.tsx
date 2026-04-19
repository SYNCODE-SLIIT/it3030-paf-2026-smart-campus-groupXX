'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs } from '@/components/ui';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketCategory, TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type CompletedTab = 'RESOLVED' | 'CLOSED' | 'REJECTED';

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
                    <TableHeader>Reported</TableHeader>
                    <TableHeader />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', margin: 0, fontSize: 13 }}>
                          No {activeTab.toLowerCase()} tickets yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((ticket) => (
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
                            onClick={() => router.push(`/ticket-managers/tickets/${ticket.ticketCode}`)}
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
        </div>
      )}
    </div>
  );
}
