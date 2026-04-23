'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Dialog, Skeleton, Textarea } from '@/components/ui';
import {
  addTicketComment,
  deleteTicketComment,
  getErrorMessage,
  getResource,
  getTicket,
  getTicketHistory,
  listTicketAttachments,
  listTicketComments,
  updateTicketComment,
  updateTicketStatus,
} from '@/lib/api-client';
import type {
  ResourceResponse,
  TicketAttachmentResponse,
  TicketCommentResponse,
  TicketResponse,
  TicketStatus,
  TicketStatusHistoryResponse,
} from '@/lib/api-types';
import {
  TicketActionsCard,
  TicketAttachmentsCard,
  TicketCommentsCard,
  TicketDescriptionCard,
  TicketDetailsCard,
  TicketHeaderCard,
  TicketHistoryCard,
  TicketLifecycleCard,
  TicketResourceCard,
} from '@/components/tickets/detail';

export function ManagerTicketDetailScreen({ ticketRef }: { ticketRef: string }) {
  const { session, appUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [ticket, setTicket] = React.useState<TicketResponse | null>(null);
  const [comments, setComments] = React.useState<TicketCommentResponse[]>([]);
  const [attachments, setAttachments] = React.useState<TicketAttachmentResponse[]>([]);
  const [history, setHistory] = React.useState<TicketStatusHistoryResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [statusNote, setStatusNote] = React.useState('');
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);

  const [commentText, setCommentText] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [commentDeleting, setCommentDeleting] = React.useState<string | null>(null);

  const [resource, setResource] = React.useState<ResourceResponse | null>(null);

  const load = React.useCallback(async () => {
    if (!accessToken) { setLoading(false); setLoadError('Your session is unavailable.'); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const [ticketData, commentsData, attachmentsData, historyData] = await Promise.all([
        getTicket(accessToken, ticketRef),
        listTicketComments(accessToken, ticketRef),
        listTicketAttachments(accessToken, ticketRef),
        getTicketHistory(accessToken, ticketRef),
      ]);
      setTicket(ticketData);
      setComments(commentsData);
      setAttachments(attachmentsData);
      setHistory(historyData);
      if (ticketData.resourceId) {
        try {
          const resourceData = await getResource(accessToken, ticketData.resourceId);
          setResource(resourceData);
        } catch {
          setResource(null);
        }
      } else {
        setResource(null);
      }
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load this ticket.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, ticketRef]);

  React.useEffect(() => { void load(); }, [load]);

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
      showToast('success', 'Status updated', `Ticket is now ${newStatus.replace('_', ' ').toLowerCase()}.`);
    } catch (error) {
      showToast('error', 'Update failed', getErrorMessage(error, 'Could not update status.'));
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
      showToast('error', 'Comment failed', getErrorMessage(error, 'Could not post the comment.'));
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!accessToken) return;
    setCommentDeleting(commentId);
    try {
      await deleteTicketComment(accessToken, ticketRef, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      showToast('error', 'Delete failed', getErrorMessage(error, 'Could not delete the comment.'));
    } finally {
      setCommentDeleting(null);
    }
  }

  async function handleEditComment(commentId: string, newText: string) {
    if (!accessToken) return;
    try {
      const updated = await updateTicketComment(accessToken, ticketRef, commentId, { commentText: newText });
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    } catch (error) {
      showToast('error', 'Edit failed', getErrorMessage(error, 'Could not update the comment.'));
      throw error;
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

  const isStatusLocked = ticket.status === 'CLOSED';
  const canComment = ticket.status !== 'OPEN'
    && ticket.status !== 'CLOSED'
    && ticket.status !== 'REJECTED';

  const commentLockReason = (ticket.status === 'CLOSED' || ticket.status === 'REJECTED')
    ? `Comments are disabled for ${ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.`
    : 'Accept the ticket first to enable comments.';

  return (
    <>
      <style>{`@media(max-width:960px){.ticket-detail-grid{grid-template-columns:1fr!important}}`}</style>

      <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()} style={{ marginBottom: 16 }}>
        Back to My Tickets
      </Button>

      {/* Hero — full width */}
      <div style={{ marginBottom: 20 }}>
        <TicketHeaderCard ticket={ticket} />
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
            formIdPrefix="mgr"
            currentUserId={appUser?.id}
            onDeleteComment={handleDeleteComment}
            commentDeleting={commentDeleting}
            onEditComment={handleEditComment}
          />
          <TicketAttachmentsCard attachments={attachments} />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isStatusLocked && (
            <TicketActionsCard
              ticket={ticket}
              statusSubmitting={statusSubmitting}
              onAccept={() => { void handleStatusChange('IN_PROGRESS'); }}
              onResolveOpen={() => setResolveModalOpen(true)}
              onClose={() => { void handleStatusChange('CLOSED'); }}
              onRejectOpen={() => setRejectModalOpen(true)}
            />
          )}
          {resource && (
            <TicketResourceCard resource={resource} />
          )}
          <TicketDetailsCard ticket={ticket} />
          <TicketLifecycleCard ticket={ticket} history={history} />
          <TicketHistoryCard history={history} />
        </div>
      </div>

      {/* Resolve modal */}
      <Dialog open={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title="Mark as Resolved" size="sm">
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Textarea
            id="mgr-resolution-notes"
            name="mgr-resolution-notes"
            label="Resolution Notes (required)"
            placeholder="Describe how the issue was resolved…"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            resize="none"
          />
          <Textarea
            id="mgr-resolve-note"
            name="mgr-resolve-note"
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
            id="mgr-rejection-reason"
            name="mgr-rejection-reason"
            label="Rejection Reason (required)"
            placeholder="Reason for rejecting this ticket…"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            resize="none"
          />
          <Textarea
            id="mgr-reject-note"
            name="mgr-reject-note"
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
