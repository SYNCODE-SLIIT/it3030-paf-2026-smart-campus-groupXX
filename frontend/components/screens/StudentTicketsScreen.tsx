'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TicketPlus } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Skeleton } from '@/components/ui';
import { SubmitTicketModal, TicketCard } from '@/components/tickets';
import { getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

const PRIORITY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const STATUS_SECTIONS: { status: TicketStatus; label: string; color: string }[] = [
  { status: 'OPEN',        label: 'Open',        color: 'var(--blue-400)' },
  { status: 'IN_PROGRESS', label: 'In Progress',  color: 'var(--yellow-400)' },
  { status: 'RESOLVED',    label: 'Resolved',     color: 'var(--green-400)' },
  { status: 'CLOSED',      label: 'Closed',       color: 'var(--neutral-400)' },
  { status: 'REJECTED',    label: 'Rejected',     color: 'var(--red-400)' },
];

function sortByPriority(tickets: TicketSummaryResponse[]): TicketSummaryResponse[] {
  return [...tickets].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );
}

interface StatusSectionProps {
  label: string;
  color: string;
  tickets: TicketSummaryResponse[];
  onView: (code: string) => void;
}

function StatusSection({ label, color, tickets, onView }: StatusSectionProps) {
  if (tickets.length === 0) return null;
  const sorted = sortByPriority(tickets);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
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
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            opacity: 0.55,
          }}
        >
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
        {sorted.map((ticket) => (
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

export function StudentTicketsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
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

  const handleView = React.useCallback(
    (code: string) => { router.push(`/students/tickets/${code}`); },
    [router],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
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
        <Button
          iconLeft={<TicketPlus size={14} />}
          onClick={() => setModalOpen(true)}
          style={{ flexShrink: 0, marginTop: 8 }}
        >
          New Ticket
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      {/* Summary cards */}
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

      {loadError && (
        <Alert variant="error" title="Load failed">
          {loadError}
        </Alert>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="line" width={180} height={14} />
                <Skeleton variant="line" width={60} height={14} />
              </div>
              <Skeleton variant="line" width="85%" height={12} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Skeleton variant="line" width={70} height={10} />
                <Skeleton variant="line" width={90} height={10} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tickets.length === 0 && !loadError && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
          No tickets yet. Use the &apos;New Ticket&apos; button to submit one.
        </p>
      )}

      {!loading && tickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {STATUS_SECTIONS.map(({ status, label, color }) => (
            <StatusSection
              key={status}
              label={label}
              color={color}
              tickets={tickets.filter((t) => t.status === status)}
              onView={handleView}
            />
          ))}
        </div>
      )}

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
