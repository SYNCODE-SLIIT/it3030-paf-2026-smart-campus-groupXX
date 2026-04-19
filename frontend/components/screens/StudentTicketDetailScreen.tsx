'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip, Trash2, Upload } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  Select,
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  addTicketComment,
  deleteTicketAttachment,
  getErrorMessage,
  getTicket,
  getTicketHistory,
  listTicketAttachments,
  listTicketComments,
  updateTicket,
  uploadTicketAttachment,
} from '@/lib/api-client';
import type {
  TicketAttachmentResponse,
  TicketCommentResponse,
  TicketPriority,
  TicketResponse,
  TicketStatus,
  TicketStatusHistoryResponse,
} from '@/lib/api-types';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

type ActiveTab = 'comments' | 'attachments' | 'history';

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICAL: 'Electrical',
  NETWORK: 'Network',
  EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture',
  CLEANLINESS: 'Cleanliness',
  FACILITY_DAMAGE: 'Facility Damage',
  ACCESS_SECURITY: 'Access / Security',
  OTHER: 'Other',
};

function statusChipColor(status: TicketStatus): 'blue' | 'yellow' | 'green' | 'neutral' | 'red' {
  switch (status) {
    case 'OPEN': return 'blue';
    case 'IN_PROGRESS': return 'yellow';
    case 'RESOLVED': return 'green';
    case 'CLOSED': return 'neutral';
    case 'REJECTED': return 'red';
  }
}

function priorityChipColor(priority: TicketPriority): 'neutral' | 'blue' | 'orange' | 'red' {
  switch (priority) {
    case 'LOW': return 'neutral';
    case 'MEDIUM': return 'blue';
    case 'HIGH': return 'orange';
    case 'URGENT': return 'red';
  }
}

function canEdit(status: TicketStatus) {
  return status === 'OPEN';
}

function formatDateTime(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function StudentTicketDetailScreen({ ticketRef }: { ticketRef: string }) {
  const { session, appUser } = useAuth();
  const router = useRouter();
  const accessToken = session?.access_token ?? null;

  const [ticket, setTicket] = React.useState<TicketResponse | null>(null);
  const [comments, setComments] = React.useState<TicketCommentResponse[]>([]);
  const [attachments, setAttachments] = React.useState<TicketAttachmentResponse[]>([]);
  const [history, setHistory] = React.useState<TicketStatusHistoryResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);

  const [editForm, setEditForm] = React.useState<{ priority: TicketPriority | ''; contactNote: string }>({
    priority: '',
    contactNote: '',
  });
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  const [commentText, setCommentText] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);

  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('comments');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      setEditForm({
        priority: ticketData.priority,
        contactNote: ticketData.contactNote ?? '',
      });
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load this ticket.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, ticketRef]);

  React.useEffect(() => {
    void load();
  }, [load]);

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
      setNotice({ variant: 'success', title: 'Updated', message: 'Ticket updated successfully.' });
    } catch (error) {
      setNotice({ variant: 'error', title: 'Update failed', message: getErrorMessage(error, 'Could not update the ticket.') });
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
      setNotice({ variant: 'error', title: 'Comment failed', message: getErrorMessage(error, 'Could not post the comment.') });
    } finally {
      setCommentSubmitting(false);
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
      setNotice({ variant: 'success', title: 'Uploaded', message: `${file.name} uploaded successfully.` });
    } catch (error) {
      setNotice({ variant: 'error', title: 'Upload failed', message: getErrorMessage(error, 'Could not upload the file.') });
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
      setNotice({ variant: 'error', title: 'Delete failed', message: getErrorMessage(error, 'Could not delete the attachment.') });
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ height: 40, background: 'var(--surface-2)', borderRadius: 8, width: 200 }} />
        <div style={{ height: 120, background: 'var(--surface-2)', borderRadius: 8 }} />
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()}>
          Back
        </Button>
        <Alert variant="error" title="Could not load ticket">
          {loadError ?? 'Ticket not found.'}
        </Alert>
      </div>
    );
  }

  const isCreator = appUser?.id === ticket.reportedById;
  const canModify = isCreator && ticket.status === 'OPEN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={14} />}
          onClick={() => router.back()}
          style={{ marginBottom: 16 }}
        >
          Back to Tickets
        </Button>

        <p
          style={{
            margin: '0 0 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '.32em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {ticket.ticketCode}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            {ticket.title}
          </h1>
          <Chip color={statusChipColor(ticket.status)} dot>
            {ticket.status.replace('_', ' ')}
          </Chip>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Category: <strong style={{ color: 'var(--text-body)' }}>{CATEGORY_LABELS[ticket.category]}</strong>
          </span>
          <Chip color={priorityChipColor(ticket.priority)}>
            {PRIORITY_LABELS[ticket.priority]}
          </Chip>
          {ticket.assignedToEmail && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Assigned: <strong style={{ color: 'var(--text-body)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ticket.assignedToEmail}</strong>
            </span>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Opened: {formatDateTime(ticket.createdAt)}
          </span>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      {canEdit(ticket.status) && (
        <Card>
          <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>
            Update Ticket
          </p>
          <form onSubmit={handleEdit} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" loading={editSubmitting} size="sm">
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {ticket.rejectionReason && (
        <Alert variant="error" title="Ticket Rejected">
          {ticket.rejectionReason}
        </Alert>
      )}

      {ticket.resolutionNotes && (
        <Alert variant="success" title="Resolution">
          {ticket.resolutionNotes}
        </Alert>
      )}

      <Card>
        <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>
          Description
        </p>
        <p style={{ margin: 0, color: 'var(--text-body)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </p>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 0 0 0', borderBottom: '1px solid var(--border)' }}>
          <Tabs
            variant="underline"
            tabs={[
              { label: 'Comments', value: 'comments', badge: comments.length },
              { label: 'Attachments', value: 'attachments', badge: attachments.length },
              { label: 'History', value: 'history', badge: history.length },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as ActiveTab)}
            style={{ padding: '0 16px' }}
          />
        </div>

        <div style={{ padding: 20 }}>
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.length === 0 && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No comments yet.</p>
              )}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: 14,
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {comment.userEmail}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(comment.createdAt)}</span>
                    {comment.isEdited && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {comment.commentText}
                  </p>
                </div>
              ))}

              {ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' ? (
                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <Textarea
                    id="comment-text"
                    name="comment-text"
                    label="Add a comment"
                    placeholder="Write your comment here…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    resize="none"
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" loading={commentSubmitting} size="sm">
                      Add Comment
                    </Button>
                  </div>
                </form>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Comments are disabled for {ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.
                </p>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {attachments.length === 0 && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No attachments yet.</p>
              )}
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <Paperclip size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500, textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                      {attachment.fileName}
                    </a>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {attachment.fileType} · {formatDateTime(attachment.uploadedAt)}
                    </p>
                  </div>
                  {canModify && (
                    <Button
                      variant="ghost-danger"
                      size="xs"
                      loading={deletingAttachmentId === attachment.id}
                      iconLeft={<Trash2 size={12} />}
                      onClick={() => { void handleDeleteAttachment(attachment.id, attachment.fileName); }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}

              {canModify && attachments.length < 3 && (
                <div style={{ marginTop: 4 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={attachmentUploading}
                    iconLeft={<Upload size={14} />}
                    onClick={() => { fileInputRef.current?.click(); }}
                  >
                    Upload File
                  </Button>
                </div>
              )}
              {canModify && attachments.length >= 3 && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Maximum of 3 attachments reached.
                </p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.length === 0 && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No history available.</p>
              )}
              {history.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {entry.oldStatus ? (
                        <>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {entry.oldStatus.replace('_', ' ')}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                        </>
                      ) : null}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-h)', fontWeight: 700 }}>
                        {entry.newStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        by <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.changedByEmail}</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {formatDateTime(entry.changedAt)}</span>
                    </div>
                    {entry.note && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
