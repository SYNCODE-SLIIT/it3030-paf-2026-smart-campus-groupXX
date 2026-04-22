'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Dialog, Skeleton, Textarea } from '@/components/ui';
import {
  addTicketComment,
  assignTicket,
  deleteResource,
  deleteTicket,
  deleteTicketComment,
  getErrorMessage,
  getResource,
  getTicket,
  getTicketHistory,
  listTicketAttachments,
  listTicketComments,
  listUsers,
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
  TicketLifecycleCard,
  TicketResourceCard,
} from '@/components/tickets/detail';

export function AdminTicketDetailScreen({ ticketRef }: { ticketRef: string }) {
  const { session, appUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [ticket, setTicket] = React.useState<TicketResponse | null>(null);
  const [comments, setComments] = React.useState<TicketCommentResponse[]>([]);
  const [attachments, setAttachments] = React.useState<TicketAttachmentResponse[]>([]);
  const [history, setHistory] = React.useState<TicketStatusHistoryResponse[]>([]);
  const [managers, setManagers] = React.useState<UserResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [assigning, setAssigning] = React.useState(false);

  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [statusNote, setStatusNote] = React.useState('');
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);

  const [commentText, setCommentText] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [commentDeleting, setCommentDeleting] = React.useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [resource, setResource] = React.useState<ResourceResponse | null>(null);
  const [deactivatingResource, setDeactivatingResource] = React.useState(false);

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

  async function handleAssignSelect(userId: string) {
    if (!accessToken) return;
    setAssigning(true);
    try {
      const updated = await assignTicket(accessToken, ticketRef, { assignedTo: userId });
      setTicket(updated);
      showToast('success', 'Assigned', 'Ticket assigned successfully.');
    } catch (error) {
      showToast('error', 'Assignment failed', getErrorMessage(error, 'Could not assign the ticket.'));
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

  async function handleDeactivateResource() {
    if (!accessToken || !resource) return;
    setDeactivatingResource(true);
    try {
      await deleteResource(accessToken, resource.id);
      setResource((prev) => prev ? { ...prev, status: 'INACTIVE' } : prev);
      showToast('success', 'Resource deactivated', `${resource.name} is now inactive.`);
    } catch (error) {
      showToast('error', 'Failed', getErrorMessage(error, 'Could not deactivate resource.'));
    } finally {
      setDeactivatingResource(false);
    }
  }

  async function handleDeleteTicket() {
    if (!accessToken) return;
    setDeleting(true);
    try {
      await deleteTicket(accessToken, ticketRef);
      router.push('/admin/tickets');
    } catch (error) {
      showToast('error', 'Delete failed', getErrorMessage(error, 'Could not delete the ticket.'));
      setDeleting(false);
      setDeleteModalOpen(false);
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
  const isCommentLocked = ticket.status === 'CLOSED' || ticket.status === 'REJECTED';
  const canDelete = ticket.status === 'CLOSED';
  const isAssignedToMe = Boolean(appUser && ticket.assignedToId === appUser.id);
  const canManageStatus = isAssignedToMe && !isStatusLocked;
  const canComment = ticket.status === 'IN_PROGRESS';

  const commentLockReason = isCommentLocked
    ? `Comments are disabled for ${ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.`
    : 'Comments are available while the ticket is in progress.';

  const adminName = appUser?.adminProfile?.fullName ?? appUser?.email;

  return (
    <>
      <style>{`@media(max-width:960px){.ticket-detail-grid{grid-template-columns:1fr!important}}`}</style>

      <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()} style={{ marginBottom: 16 }}>
        Back to Tickets
      </Button>



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
            currentUserId={appUser?.id}
            canDeleteAny
            onDeleteComment={handleDeleteComment}
            commentDeleting={commentDeleting}
            onEditComment={handleEditComment}
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
          {canDelete && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Danger Zone
              </p>
              <Button
                variant="danger"
                size="sm"
                iconLeft={<Trash2 size={13} />}
                style={{ width: '100%' }}
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete Ticket
              </Button>
            </div>
          )}
          {resource && (
            <TicketResourceCard
              resource={resource}
              canDeactivate
              onDeactivate={() => { void handleDeactivateResource(); }}
              deactivating={deactivatingResource}
            />
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

      {/* Delete ticket modal */}
      <Dialog open={deleteModalOpen} onClose={() => { if (!deleting) setDeleteModalOpen(false); }} title="Delete Ticket" size="sm">
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)' }}>
            This will permanently delete ticket <strong>{ticketRef}</strong> and all its attachments. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={() => { void handleDeleteTicket(); }}>
              Delete Ticket
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
