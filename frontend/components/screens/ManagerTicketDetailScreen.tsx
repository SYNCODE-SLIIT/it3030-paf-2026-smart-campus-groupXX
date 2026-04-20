'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Dialog, Skeleton, Textarea } from '@/components/ui';
import {
  addTicketComment,
  getErrorMessage,
  getTicket,
  getTicketHistory,
  listTicketAttachments,
  listTicketComments,
  updateTicketStatus,
} from '@/lib/api-client';
import type {
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
} from '@/components/tickets/detail';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

export function ManagerTicketDetailScreen({ ticketRef }: { ticketRef: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [ticket, setTicket] = React.useState<TicketResponse | null>(null);
  const [comments, setComments] = React.useState<TicketCommentResponse[]>([]);
  const [attachments, setAttachments] = React.useState<TicketAttachmentResponse[]>([]);
  const [history, setHistory] = React.useState<TicketStatusHistoryResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);

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

  const isFinal = ticket.status === 'CLOSED' || ticket.status === 'REJECTED';
  const canComment = ticket.status !== 'OPEN' && !isFinal;

  const commentLockReason = isFinal
    ? `Comments are disabled for ${ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.`
    : 'Accept the ticket first to enable comments.';

  return (
    <>
      <style>{`@media(max-width:960px){.ticket-detail-grid{grid-template-columns:1fr!important}}`}</style>

      <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()} style={{ marginBottom: 16 }}>
        Back to My Tickets
      </Button>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)} style={{ marginBottom: 20 }}>
          {notice.message}
        </Alert>
      )}

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
          />
          <TicketAttachmentsCard attachments={attachments} />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isFinal && (
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
