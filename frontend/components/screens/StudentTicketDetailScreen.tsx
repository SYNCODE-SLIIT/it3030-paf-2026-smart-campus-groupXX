'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Dialog, Input, Select, Skeleton } from '@/components/ui';
import {
  addTicketComment,
  deleteTicket,
  deleteTicketAttachment,
  deleteTicketComment,
  getErrorMessage,
  getTicket,
  getTicketHistory,
  listTicketAttachments,
  listTicketComments,
  updateTicket,
  updateTicketComment,
  uploadTicketAttachment,
} from '@/lib/api-client';
import type {
  TicketAttachmentResponse,
  TicketCommentResponse,
  TicketPriority,
  TicketResponse,
  TicketStatusHistoryResponse,
} from '@/lib/api-types';
import {
  TicketAttachmentsCard,
  TicketCommentsCard,
  TicketDescriptionCard,
  TicketDetailsCard,
  TicketHeaderCard,
  TicketHistoryCard,
} from '@/components/tickets/detail';
import { PRIORITY_LABELS, SEC_HD_LABEL } from '@/components/tickets/detail/ticketDetailHelpers';

export function StudentTicketDetailScreen({ ticketRef }: { ticketRef: string }) {
  return (
    <RequesterTicketDetailScreen
      ticketRef={ticketRef}
      ticketsHref="/students/tickets"
      formIdPrefix="student"
    />
  );
}

export function RequesterTicketDetailScreen({
  ticketRef,
  ticketsHref,
  formIdPrefix,
}: {
  ticketRef: string;
  ticketsHref: string;
  formIdPrefix: string;
}) {
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

  const [editForm, setEditForm] = React.useState<{ priority: TicketPriority | ''; contactNote: string }>({
    priority: '',
    contactNote: '',
  });
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  const [commentText, setCommentText] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [commentDeleting, setCommentDeleting] = React.useState<string | null>(null);

  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = React.useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError('Your session is unavailable. Please sign in again.');
      return;
    }
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
      setEditForm({ priority: ticketData.priority, contactNote: ticketData.contactNote ?? '' });
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load this ticket.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, ticketRef]);

  React.useEffect(() => { void load(); }, [load]);

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !ticket) return;
    setEditSubmitting(true);
    try {
      const updated = await updateTicket(accessToken, ticketRef, {
        priority: editForm.priority || undefined,
        contactNote: editForm.contactNote.trim() || undefined,
      });
      setTicket(updated);
      showToast('success', 'Updated', 'Ticket updated successfully.');
    } catch (error) {
      showToast('error', 'Update failed', getErrorMessage(error, 'Could not update the ticket.'));
    } finally {
      setEditSubmitting(false);
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

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;
    event.target.value = '';
    setAttachmentUploading(true);
    try {
      const newAttachment = await uploadTicketAttachment(accessToken, ticketRef, file);
      setAttachments((prev) => [...prev, newAttachment]);
      showToast('success', 'Uploaded', `${file.name} uploaded successfully.`);
    } catch (error) {
      showToast('error', 'Upload failed', getErrorMessage(error, 'Could not upload the file.'));
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string, fileName: string) {
    if (!accessToken) return;
    if (!window.confirm(`Delete attachment "${fileName}"?`)) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteTicketAttachment(accessToken, ticketRef, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error) {
      showToast('error', 'Delete failed', getErrorMessage(error, 'Could not delete the attachment.'));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleDeleteTicket() {
    if (!accessToken) return;
    setDeleting(true);
    try {
      await deleteTicket(accessToken, ticketRef);
      router.push('/students/tickets');
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
        <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.push(ticketsHref)}>Back</Button>
        <Alert variant="error" title="Could not load ticket">{loadError ?? 'Ticket not found.'}</Alert>
      </div>
    );
  }

  const isCreator = appUser?.id === ticket.reportedById;
  const canDelete = isCreator && ticket.status === 'OPEN' && ticket.assignedToId === null;
  const canModify = isCreator && ticket.status === 'OPEN';
  const canComment = ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED';
  const commentLockReason = `Comments are disabled for ${ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.`;

  return (
    <>
      <style>{`@media(max-width:960px){.ticket-detail-grid{grid-template-columns:1fr!important}}`}</style>

      <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.push(ticketsHref)} style={{ marginBottom: 16 }}>
        Back to Tickets
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
            formIdPrefix={formIdPrefix}
            currentUserId={appUser?.id}
            onDeleteComment={handleDeleteComment}
            commentDeleting={commentDeleting}
            onEditComment={handleEditComment}
          />
          <TicketAttachmentsCard
            attachments={attachments}
            canUpload={canModify && attachments.length < 3}
            canDelete={canModify}
            maxAttachments={3}
            attachmentUploading={attachmentUploading}
            deletingAttachmentId={deletingAttachmentId}
            onUpload={handleUpload}
            onDelete={handleDeleteAttachment}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TicketDetailsCard ticket={ticket} />
          <TicketHistoryCard history={history} />

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

          {canModify && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--card-shadow)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={SEC_HD_LABEL}>Edit Ticket</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Select
                    id="edit-priority"
                    name="edit-priority"
                    label="Priority"
                    value={editForm.priority}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value as TicketPriority }))}
                    options={(Object.entries(PRIORITY_LABELS) as [TicketPriority, string][]).map(([value, label]) => ({ value, label }))}
                  />
                  <Input
                    id="edit-contact"
                    name="edit-contact"
                    label="Contact Note"
                    placeholder="Best way to reach you"
                    value={editForm.contactNote}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, contactNote: e.target.value }))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" loading={editSubmitting} size="sm">Save Changes</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

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
