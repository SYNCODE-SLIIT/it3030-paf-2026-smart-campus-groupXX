'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TicketPlus } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Dialog, Skeleton, Tabs } from '@/components/ui';
import { SubmitTicketModal, TicketCard, TicketsSectionSkeleton } from '@/components/tickets';
import { deleteTicket, getErrorMessage, listMyTickets } from '@/lib/api-client';
import type { TicketPriority, TicketQueryScope, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

type StatusFilter = TicketStatus | 'ALL';

const PRIORITY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  URGENT: 'var(--red-400)',
  HIGH: 'var(--orange-400)',
  MEDIUM: 'var(--blue-400)',
  LOW: 'var(--neutral-400)',
};

function resolveStatusFilter(value: string | null): StatusFilter {
  return STATUS_TABS.some((tab) => tab.value === value) ? (value as StatusFilter) : 'ALL';
}

interface TicketSectionProps {
  label: string;
  color: string;
  tickets: TicketSummaryResponse[];
  onView: (code: string) => void;
  onDelete: (code: string) => void;
}

function TicketSection({ label, color, tickets, onView, onDelete }: TicketSectionProps) {
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
        {tickets.map((ticket) => (
          <div key={ticket.id} style={{ minWidth: 320, maxWidth: 340, flexShrink: 0 }}>
            <TicketCard
              ticket={ticket}
              onView={() => onView(ticket.ticketCode)}
              onDelete={ticket.status === 'OPEN' && ticket.assignedToId === null ? () => onDelete(ticket.ticketCode) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentTicketsScreen() {
  return (
    <React.Suspense fallback={<Skeleton variant="rect" height={60} />}>
      <RequesterTicketsScreen
        workspaceLabel="Student Workspace"
        description="Report campus issues and track their resolution."
        ticketsBasePath="/students/tickets"
      />
    </React.Suspense>
  );
}

export function RequesterTicketsScreen({
  workspaceLabel,
  description,
  ticketsBasePath,
  ticketScope = 'REPORTED',
}: {
  workspaceLabel: string;
  description: string;
  ticketsBasePath: string;
  ticketScope?: TicketQueryScope;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = session?.access_token ?? null;
  const initialStatus = resolveStatusFilter(searchParams.get('status'));

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatus);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deleteConfirmCode, setDeleteConfirmCode] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listMyTickets(accessToken, { scope: ticketScope });
      setTickets(list);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load your tickets.'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, ticketScope]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    setStatusFilter(resolveStatusFilter(searchParams.get('status')));
  }, [searchParams]);

  const tabCounts = React.useMemo(() => ({
    ALL: tickets.length,
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
    REJECTED: tickets.filter((t) => t.status === 'REJECTED').length,
  } satisfies Record<StatusFilter, number>), [tickets]);

  const filteredTickets = React.useMemo(() => {
    if (statusFilter === 'ALL') return tickets;
    return tickets.filter((ticket) => ticket.status === statusFilter);
  }, [tickets, statusFilter]);

  const priorityGroups = React.useMemo(
    () =>
      PRIORITY_ORDER
        .map((priority) => ({
          priority,
          tickets: filteredTickets.filter((ticket) => ticket.priority === priority),
        }))
        .filter((group) => group.tickets.length > 0),
    [filteredTickets],
  );

  const handleDeleteRequest = React.useCallback((ticketCode: string) => {
    setDeleteConfirmCode(ticketCode);
  }, []);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!accessToken || !deleteConfirmCode) return;
    setDeleting(true);
    try {
      await deleteTicket(accessToken, deleteConfirmCode);
      setTickets((prev) => prev.filter((t) => t.ticketCode !== deleteConfirmCode));
      showToast('success', 'Deleted', `Ticket ${deleteConfirmCode} has been permanently deleted.`);
      setDeleteConfirmCode(null);
    } catch (err) {
      showToast('error', 'Delete failed', getErrorMessage(err, 'Could not delete the ticket.'));
    } finally {
      setDeleting(false);
    }
  }, [accessToken, deleteConfirmCode, showToast]);

  const handleView = React.useCallback(
    (code: string) => { router.push(`${ticketsBasePath}/${code}`); },
    [router, ticketsBasePath],
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
            {workspaceLabel}
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
            {description}
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

      <Tabs
        variant="pill"
        tabs={STATUS_TABS.map((tab) => ({ ...tab, badge: tabCounts[tab.value] }))}
        value={statusFilter}
        onChange={(value) => setStatusFilter(value as StatusFilter)}
      />

      {loadError && (
        <Alert variant="error" title="Load failed">
          {loadError}
        </Alert>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <TicketsSectionSkeleton count={3} />
          <TicketsSectionSkeleton count={3} />
        </div>
      )}

      {!loading && tickets.length === 0 && !loadError && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
          No tickets yet. Use the &apos;New Ticket&apos; button to submit one.
        </p>
      )}

      {!loading && tickets.length > 0 && priorityGroups.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
          No tickets match the selected status.
        </p>
      )}

      {!loading && priorityGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {priorityGroups.map(({ priority, tickets: groupedTickets }) => (
            <TicketSection
              key={priority}
              label={PRIORITY_LABELS[priority]}
              color={PRIORITY_COLOR[priority]}
              tickets={groupedTickets}
              onView={handleView}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      <Dialog
        open={deleteConfirmCode !== null}
        onClose={() => { if (!deleting) setDeleteConfirmCode(null); }}
        title="Delete Ticket"
        size="sm"
      >
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)' }}>
            This will permanently delete ticket <strong>{deleteConfirmCode}</strong> and all its attachments. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmCode(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={() => { void handleDeleteConfirm(); }}>
              Delete Ticket
            </Button>
          </div>
        </div>
      </Dialog>

      <SubmitTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          void reload();
          showToast('success', 'Ticket submitted', 'Your support ticket has been created.');
        }}
      />
    </div>
  );
}
