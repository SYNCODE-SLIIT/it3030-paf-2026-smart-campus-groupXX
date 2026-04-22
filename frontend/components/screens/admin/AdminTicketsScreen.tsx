'use client';

import React from 'react';
import { TicketPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Card, Dialog, Skeleton, Tabs } from '@/components/ui';
import { SubmitTicketModal, TicketCard, TicketsSectionSkeleton } from '@/components/tickets';
import { assignTicket, deleteTicket, getErrorMessage, listMyTickets, listUsers } from '@/lib/api-client';
import type { TicketPriority, TicketStatus, TicketSummaryResponse, UserResponse } from '@/lib/api-types';

type MainTab = 'unassigned' | 'assigned' | 'in_progress' | 'done';
type QueueFilter = 'all' | 'mine';
type SortOrder = 'oldest' | 'newest';

const PRIORITY_ORDER: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

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

const DONE_STATUS_ORDER: TicketStatus[] = ['RESOLVED', 'CLOSED', 'REJECTED'];

const DONE_STATUS_LABELS: Partial<Record<TicketStatus, string>> = {
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const DONE_STATUS_COLOR: Partial<Record<TicketStatus, string>> = {
  RESOLVED: 'var(--green-400)',
  CLOSED: 'var(--neutral-400)',
  REJECTED: 'var(--red-400)',
};

const DONE_STATUSES = new Set<TicketStatus>(['RESOLVED', 'CLOSED', 'REJECTED']);

function sortByDate(tickets: TicketSummaryResponse[], order: SortOrder): TicketSummaryResponse[] {
  return [...tickets].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return order === 'oldest' ? diff : -diff;
  });
}

interface AssignOption {
  id: string;
  label: string;
}

function getDisplayName(user: UserResponse): string {
  if (user.userType === 'ADMIN') return user.adminProfile?.fullName || user.email;
  const preferred = user.managerProfile?.preferredName;
  if (preferred) return preferred;
  const full = `${user.managerProfile?.firstName ?? ''} ${user.managerProfile?.lastName ?? ''}`.trim();
  return full || user.email;
}

interface SectionProps {
  label: string;
  color: string;
  tickets: TicketSummaryResponse[];
  onView: (code: string) => void;
  assignOptions?: AssignOption[];
  onAssign?: (ticketCode: string, userId: string) => void;
  onDelete?: (ticketCode: string) => void;
}

function TicketSection({ label, color, tickets, onView, assignOptions, onAssign, onDelete }: SectionProps) {
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
              showReporter
              onView={() => onView(ticket.ticketCode)}
              assignOptions={assignOptions}
              onAssign={onAssign ? (userId) => onAssign(ticket.ticketCode, userId) : undefined}
              onDelete={onDelete ? () => onDelete(ticket.ticketCode) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminTicketsScreen() {
  const { session, appUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [managers, setManagers] = React.useState<UserResponse[]>([]);
  const [mainTab, setMainTab] = React.useState<MainTab>('unassigned');
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>('all');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('oldest');
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [submitModalOpen, setSubmitModalOpen] = React.useState(false);

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
      setLoadError(getErrorMessage(error, 'We could not load tickets.'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!accessToken) return;
    listUsers(accessToken, { userType: 'MANAGER', managerRole: 'TICKET_MANAGER' })
      .then(setManagers)
      .catch(() => {});
  }, [accessToken]);

  const assignOptions = React.useMemo<AssignOption[]>(() => {
    const opts: AssignOption[] = [];
    if (appUser) {
      opts.push({ id: appUser.id, label: `${getDisplayName(appUser)} (You)` });
    }
    for (const m of managers) {
      opts.push({ id: m.id, label: getDisplayName(m) });
    }
    return opts;
  }, [appUser, managers]);

  const handleAssign = React.useCallback(
    async (ticketCode: string, userId: string) => {
      if (!accessToken) return;
      try {
        const updated = await assignTicket(accessToken, ticketCode, { assignedTo: userId });
        setTickets((prev) => prev.map((t) => (t.ticketCode === ticketCode ? updated : t)));
        showToast('success', 'Assigned', `Ticket ${ticketCode} has been assigned.`);
      } catch (err) {
        showToast('error', 'Assignment failed', getErrorMessage(err, 'Could not assign ticket.'));
      }
    },
    [accessToken],
  );

  const queueFiltered = React.useMemo(() => {
    if (queueFilter === 'mine' && appUser) {
      return tickets.filter((t) => t.assignedToId === appUser.id);
    }
    return tickets;
  }, [tickets, queueFilter, appUser]);

  // Mutually exclusive tab groups
  const unassigned = React.useMemo(
    () => queueFiltered.filter((t) => t.assignedToId === null && t.status === 'OPEN'),
    [queueFiltered],
  );
  const assigned = React.useMemo(
    () => queueFiltered.filter((t) => t.assignedToId !== null && t.status === 'OPEN'),
    [queueFiltered],
  );
  const inProgress = React.useMemo(
    () => queueFiltered.filter((t) => t.status === 'IN_PROGRESS'),
    [queueFiltered],
  );
  const done = React.useMemo(
    () => queueFiltered.filter((t) => DONE_STATUSES.has(t.status)),
    [queueFiltered],
  );

  // Summary counts always based on all tickets (not queue filtered)
  const summaryUnassigned = tickets.filter((t) => t.assignedToId === null && t.status === 'OPEN').length;
  const summaryAssigned   = tickets.filter((t) => t.assignedToId !== null && t.status === 'OPEN').length;
  const summaryInProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const summaryDone       = tickets.filter((t) => DONE_STATUSES.has(t.status)).length;

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
  }, [accessToken, deleteConfirmCode]);

  const handleView = React.useCallback(
    (code: string) => { router.push(`/admin/tickets/${code}`); },
    [router],
  );

  const currentCount = queueFilter === 'mine'
    ? assigned.length + inProgress.length
    : mainTab === 'unassigned' ? unassigned.length
    : mainTab === 'assigned' ? assigned.length
    : mainTab === 'in_progress' ? inProgress.length
    : done.length;

  const renderMyQueue = () => {
    const sections: { label: string; color: string; base: TicketSummaryResponse[] }[] = [
      { label: 'Open',        color: 'var(--blue-400)',   base: assigned },
      { label: 'In Progress', color: 'var(--yellow-400)', base: inProgress },
    ];

    const hasAny = sections.some((s) => s.base.length > 0);
    if (!hasAny) {
      return (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
          No tickets in your queue.
        </p>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {sections.map(({ label, color, base }) => {
          const groups = PRIORITY_ORDER
            .map((priority) => ({
              priority,
              tickets: sortByDate(base.filter((t) => t.priority === priority), sortOrder),
            }))
            .filter((g) => g.tickets.length > 0);

          if (groups.length === 0) return null;

          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Status heading */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '.22em',
                    textTransform: 'uppercase',
                    color,
                    padding: '0 4px',
                  }}
                >
                  {label}
                </span>
                <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {groups.map(({ priority, tickets: t }) => (
                  <TicketSection
                    key={priority}
                    label={PRIORITY_LABELS[priority]}
                    color={PRIORITY_COLOR[priority]}
                    tickets={t}
                    onView={handleView}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <TicketsSectionSkeleton count={3} />
          <TicketsSectionSkeleton count={3} />
        </div>
      );
    }

    if (queueFilter === 'mine') return renderMyQueue();

    if (mainTab === 'done') {
      const groups = DONE_STATUS_ORDER
        .map((status) => ({
          status,
          tickets: sortByDate(done.filter((t) => t.status === status), sortOrder),
        }))
        .filter((g) => g.tickets.length > 0);

      if (groups.length === 0) {
        return (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
            No completed tickets.
          </p>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {groups.map(({ status, tickets: t }) => (
            <TicketSection
              key={status}
              label={DONE_STATUS_LABELS[status] ?? status}
              color={DONE_STATUS_COLOR[status] ?? 'var(--border)'}
              tickets={t}
              onView={handleView}
              onDelete={status === 'CLOSED' ? handleDeleteRequest : undefined}
            />
          ))}
        </div>
      );
    }

    const base = mainTab === 'unassigned' ? unassigned : mainTab === 'assigned' ? assigned : inProgress;
    const groups = PRIORITY_ORDER
      .map((priority) => ({
        priority,
        tickets: sortByDate(base.filter((t) => t.priority === priority), sortOrder),
      }))
      .filter((g) => g.tickets.length > 0);

    if (groups.length === 0) {
      const emptyMsg: Record<Exclude<MainTab, 'done'>, string> = {
        unassigned: 'No tickets awaiting assignment.',
        assigned: 'No tickets waiting for action.',
        in_progress: 'No tickets currently in progress.',
      };
      return (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
          {emptyMsg[mainTab as Exclude<MainTab, 'done'>]}
        </p>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {groups.map(({ priority, tickets: t }) => (
          <TicketSection
            key={priority}
            label={PRIORITY_LABELS[priority]}
            color={PRIORITY_COLOR[priority]}
            tickets={t}
            onView={handleView}
            assignOptions={mainTab === 'unassigned' ? assignOptions : undefined}
            onAssign={mainTab === 'unassigned' ? handleAssign : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
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
            Admin Console
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
            Ticket Management
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            View all campus support tickets and assign them to ticket managers.
          </p>
        </div>
        <Button iconLeft={<TicketPlus size={14} />} onClick={() => setSubmitModalOpen(true)} style={{ flexShrink: 0, marginTop: 8 }}>
          New Ticket
        </Button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {(
          [
            { label: 'Unassigned',   count: summaryUnassigned,  color: 'var(--orange-400)' },
            { label: 'Assigned',     count: summaryAssigned,    color: 'var(--blue-400)' },
            { label: 'In Progress',  count: summaryInProgress,  color: 'var(--yellow-500)' },
            { label: 'Done',         count: summaryDone,        color: 'var(--green-400)' },
          ] as const
        ).map(({ label, count, color }) => (
          <Card key={label}>
            <p
              style={{
                margin: '0 0 8px',
                color: 'var(--text-muted)',
                fontSize: 11,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {label}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 800,
                color,
              }}
            >
              {count}
            </p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Queue filter + main nav tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <Tabs
            variant="pill"
            tabs={[
              { label: 'All Tickets', value: 'all',  badge: tickets.length },
              { label: 'My Queue',    value: 'mine', badge: appUser ? tickets.filter((t) => t.assignedToId === appUser.id).length : 0 },
            ]}
            value={queueFilter}
            onChange={(v) => setQueueFilter(v as QueueFilter)}
          />
        </div>

        {queueFilter === 'all' && (
          <Tabs
            variant="pill"
            tabs={[
              { label: 'Unassigned',  value: 'unassigned',  badge: unassigned.length },
              { label: 'Assigned',    value: 'assigned',    badge: assigned.length },
              { label: 'In Progress', value: 'in_progress', badge: inProgress.length },
              { label: 'Done',        value: 'done',        badge: done.length },
            ]}
            value={mainTab}
            onChange={(v) => { setMainTab(v as MainTab); }}
          />
        )}

        {loadError && (
          <Alert variant="error" title="Load failed">
            {loadError}
          </Alert>
        )}

        {/* Sort toggle — only shown when there are tickets to sort */}
        {!loading && currentCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSortOrder((s) => (s === 'oldest' ? 'newest' : 'oldest'))}
            >
              {sortOrder === 'oldest' ? '↑ Oldest first' : '↓ Newest first'}
            </Button>
          </div>
        )}

        {renderContent()}
      </div>

      <SubmitTicketModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={() => {
          void reload();
          showToast('success', 'Ticket submitted', 'Your support ticket has been created.');
        }}
      />

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
    </div>
  );
}
