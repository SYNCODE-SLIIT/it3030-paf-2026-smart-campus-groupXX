'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Dialog, Skeleton, Textarea } from '@/components/ui';
import {
  addTicketComment,
  assignTicket,
  getErrorMessage,
  getTicket,
  getTicketHistory,
  listTicketAttachments,
  listTicketComments,
  listUsers,
  updateTicketStatus,
} from '@/lib/api-client';
import type {
  TicketAttachmentResponse,
  TicketCommentResponse,
  TicketResponse,
  TicketStatus,
  TicketStatusHistoryResponse,
  UserResponse,
} from '@/lib/api-types';
import {
  AssignmentDropdownButton,
  TicketActionsCard,
  TicketAttachmentsCard,
  TicketCommentsCard,
  TicketDescriptionCard,
  TicketDetailsCard,
  TicketHeaderCard,
  TicketHistoryCard,
} from '@/components/tickets/detail';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

export function AdminTicketDetailScreen({ ticketRef }: { ticketRef: string }) {
  const { session, appUser } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [ticket, setTicket] = React.useState<TicketResponse | null>(null);
  const [comments, setComments] = React.useState<TicketCommentResponse[]>([]);
  const [attachments, setAttachments] = React.useState<TicketAttachmentResponse[]>([]);
  const [history, setHistory] = React.useState<TicketStatusHistoryResponse[]>([]);
  const [managers, setManagers] = React.useState<UserResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);

  const [assigning, setAssigning] = React.useState(false);

  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [statusNote, setStatusNote] = React.useState('');
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);

  const [commentText, setCommentText] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!accessToken) { setLoading(false); setLoadError('Your session is unavailable.'); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const [ticketData, commentsData, attachmentsData, historyData, managersData] = await Promise.all([
        getTicket(accessToken, ticketRef),
        listTicketComments(accessToken, ticketRef),
        listTicketAttachments(accessToken, ticketRef),
        getTicketHistory(accessToken, ticketRef),
        listUsers(accessToken, { userType: 'MANAGER', managerRole: 'TICKET_MANAGER' }),
      ]);
      setTicket(ticketData);
      setComments(commentsData);
      setAttachments(attachmentsData);
      setHistory(historyData);
      setManagers(managersData);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load this ticket.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, ticketRef]);

  React.useEffect(() => { void load(); }, [load]);

  async function handleAssignSelect(userId: string) {
    if (!accessToken) return;
    setAssigning(true);
    try {
      const updated = await assignTicket(accessToken, ticketRef, { assignedTo: userId });
      setTicket(updated);
      setNotice({ variant: 'success', title: 'Assigned', message: 'Ticket assigned successfully.' });
    } catch (error) {
      setNotice({ variant: 'error', title: 'Assignment failed', message: getErrorMessage(error, 'Could not assign the ticket.') });
    } finally {
      setAssigning(false);
    }
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!accessToken) return;
    setStatusSubmitting(true);
    try {
      const updated = await updateTicketStatus(accessToken, ticketRef, {
        newStatus,
        note: statusNote.trim() || undefined,
        resolutionNotes: resolutionNotes.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
      });
      setTicket(updated);
      const fresh = await getTicketHistory(accessToken, ticketRef);
      setHistory(fresh);
      setStatusNote('');
      setResolutionNotes('');
      setRejectionReason('');
      setResolveModalOpen(false);
      setRejectModalOpen(false);
      setNotice({ variant: 'success', title: 'Status updated', message: `Ticket is now ${newStatus.replace('_', ' ').toLowerCase()}.` });
    } catch (error) {
      setNotice({ variant: 'error', title: 'Update failed', message: getErrorMessage(error, 'Could not update status.') });
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleAddComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const newComment = await addTicketComment(accessToken, ticketRef, { commentText: commentText.trim() });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (error) {
      setNotice({ variant: 'error', title: 'Comment failed', message: getErrorMessage(error, 'Could not post the comment.') });
    } finally {
      setCommentSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Skeleton variant="line" width={120} height={28} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', padding: 20 }}>
          <Skeleton variant="line" width="60%" height={20} />
          <Skeleton variant="line" width="40%" height={14} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Skeleton variant="line" width={70} height={12} />
            <Skeleton variant="line" width={90} height={12} />
          </div>
        </div>
        <Skeleton variant="rect" height={160} />
        <Skeleton variant="rect" height={120} />
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()}>Back</Button>
        <Alert variant="error" title="Could not load ticket">{loadError ?? 'Ticket not found.'}</Alert>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'REJECTED';
  const isAssignedToMe = Boolean(appUser && ticket.assignedToId === appUser.id);
  const canManageStatus = isAssignedToMe && !isClosed;
  const canComment = ticket.status === 'IN_PROGRESS';

  const commentLockReason = isClosed
    ? `Comments are disabled for ${ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.`
    : 'Comments are available while the ticket is in progress.';

  const adminName = appUser?.adminProfile?.fullName ?? appUser?.email;

  return (
    <>
      <style>{`@media(max-width:960px){.ticket-detail-grid{grid-template-columns:1fr!important}}`}</style>

      <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()} style={{ marginBottom: 16 }}>
        Back to Tickets
      </Button>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)} style={{ marginBottom: 20 }}>
          {notice.message}
        </Alert>
      )}

      {/* Hero — full width */}
      <div style={{ marginBottom: 20 }}>
        <TicketHeaderCard
          ticket={ticket}
          assignmentSlot={
            <AssignmentDropdownButton
              ticket={ticket}
              managers={managers}
              appUserId={appUser?.id ?? ''}
              appUserName={adminName}
              assigning={assigning}
              onAssign={handleAssignSelect}
            />
          }
        />
      </div>

      {/* Two-column grid */}
      <div
        className="ticket-detail-grid"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}
      >
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(ticket.resolutionNotes || ticket.rejectionReason) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ticket.resolutionNotes && (
                <Alert variant="success" title="Resolution Notes">{ticket.resolutionNotes}</Alert>
              )}
              {ticket.rejectionReason && (
                <Alert variant="error" title="Ticket Rejected">{ticket.rejectionReason}</Alert>
              )}
            </div>
          )}
          <TicketDescriptionCard description={ticket.description} />
          <TicketCommentsCard
            comments={comments}
            canComment={canComment}
            commentLockReason={commentLockReason}
            commentText={commentText}
            commentSubmitting={commentSubmitting}
            onCommentChange={setCommentText}
            onCommentSubmit={handleAddComment}
            formIdPrefix="admin"
          />
          <TicketAttachmentsCard attachments={attachments} />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {canManageStatus && (
            <TicketActionsCard
              ticket={ticket}
              statusSubmitting={statusSubmitting}
              onAccept={() => { void handleStatusChange('IN_PROGRESS'); }}
              onResolveOpen={() => setResolveModalOpen(true)}
              onClose={() => { void handleStatusChange('CLOSED'); }}
              onRejectOpen={() => setRejectModalOpen(true)}
            />
          )}
          <TicketDetailsCard ticket={ticket} />
          <TicketHistoryCard history={history} />
        </div>
      </div>

      {/* Resolve modal */}
      <Dialog open={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title="Mark as Resolved" size="sm">
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Textarea
            id="admin-resolution-notes"
            name="admin-resolution-notes"
            label="Resolution Notes (required)"
            placeholder="Describe how the issue was resolved…"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            resize="none"
          />
          <Textarea
            id="admin-resolve-note"
            name="admin-resolve-note"
            label="Optional note"
            placeholder="Additional note for the status change…"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={2}
            resize="none"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => setResolveModalOpen(false)} disabled={statusSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={statusSubmitting}
              disabled={!resolutionNotes.trim()}
              onClick={() => { void handleStatusChange('RESOLVED'); }}
            >
              Confirm Resolved
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Ticket" size="sm">
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Textarea
            id="admin-rejection-reason"
            name="admin-rejection-reason"
            label="Rejection Reason (required)"
            placeholder="Reason for rejecting this ticket…"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            resize="none"
          />
          <Textarea
            id="admin-reject-note"
            name="admin-reject-note"
            label="Optional note"
            placeholder="Additional note for the status change…"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={2}
            resize="none"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => setRejectModalOpen(false)} disabled={statusSubmitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={statusSubmitting}
              disabled={!rejectionReason.trim()}
              onClick={() => { void handleStatusChange('REJECTED'); }}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
