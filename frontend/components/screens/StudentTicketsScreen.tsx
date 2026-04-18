'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TicketPlus } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import {
  Alert,
  Button,
  Card,
  Tabs,
} from '@/components/ui';
import { SubmitTicketModal, TicketCard } from '@/components/tickets';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

type StatusFilter = TicketStatus | 'ALL';


export function StudentTicketsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }

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

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;

  const tabCounts: Record<StatusFilter, number> = {
    ALL: tickets.length,
    OPEN: openCount,
    IN_PROGRESS: inProgressCount,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
    REJECTED: tickets.filter((t) => t.status === 'REJECTED').length,
  };

  const filtered = statusFilter === 'ALL' ? tickets : tickets.filter((t) => t.status === statusFilter);

  const statusTabs = (
    [
      { label: 'All', value: 'ALL' },
      { label: 'Open', value: 'OPEN' },
      { label: 'In Progress', value: 'IN_PROGRESS' },
      { label: 'Resolved', value: 'RESOLVED' },
      { label: 'Closed', value: 'CLOSED' },
      { label: 'Rejected', value: 'REJECTED' },
    ] satisfies { label: string; value: StatusFilter }[]
  ).map((tab) => ({ ...tab, badge: tabCounts[tab.value] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.32em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Student Workspace
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Support Tickets
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Report campus issues and track their resolution.
          </p>
        </div>
        <Button iconLeft={<TicketPlus size={14} />} onClick={() => setModalOpen(true)} style={{ flexShrink: 0, marginTop: 8 }}>
          New Ticket
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Card>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Open
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)' }}>
            {openCount}
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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Tabs
          variant="pill"
          tabs={statusTabs}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        {loadError && (
          <Alert variant="error" title="Load failed">
            {loadError}
          </Alert>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
            {statusFilter === 'ALL'
              ? "No tickets yet. Use the 'New Ticket' button to submit one."
              : `No ${statusFilter.toLowerCase().replace('_', ' ')} tickets.`}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onView={() => { router.push(`/students/tickets/${ticket.id}`); }}
            />
          ))}
        </div>
      </div>

      <SubmitTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          void reload();
          setNotice({ variant: 'success', title: 'Ticket submitted', message: 'Your support ticket has been created.' });
        }}
      />
    </div>
  );
}
