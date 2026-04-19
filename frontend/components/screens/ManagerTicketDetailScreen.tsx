'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Tabs, Textarea } from '@/components/ui';
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

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-LK', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
}

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
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('comments');

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
      setResolutionNotes(ticketData.resolutionNotes ?? '');
      setRejectionReason(ticketData.rejectionReason ?? '');
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
        <div style={{ height: 40, background: 'var(--surface-2)', borderRadius: 8, width: 200 }} />
        <div style={{ height: 120, background: 'var(--surface-2)', borderRadius: 8 }} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()} style={{ marginBottom: 16 }}>
          Back to My Tickets
        </Button>
        <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {ticket.ticketCode}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
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
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Priority: <strong style={{ color: 'var(--text-body)' }}>{PRIORITY_LABELS[ticket.priority]}</strong>
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Reporter: <strong style={{ color: 'var(--text-body)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ticket.reportedByEmail}</strong>
          </span>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      {/* Status Action Panel */}
      {!isFinal && (
        <Card>
          <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>
            Ticket Actions
          </p>

          {ticket.status === 'OPEN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Accept this ticket to begin working on it. Comments will become available after acceptance.
              </p>
              <Button onClick={() => { void handleStatusChange('IN_PROGRESS'); }} loading={statusSubmitting}>
                Accept Ticket (→ In Progress)
              </Button>
            </div>
          )}

          {ticket.status === 'IN_PROGRESS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Textarea
                id="mgr-resolution-notes"
                name="mgr-resolution-notes"
                label="Resolution Notes (required to resolve)"
                placeholder="Describe how the issue was resolved…"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                resize="none"
              />
              <Textarea
                id="mgr-rejection-reason"
                name="mgr-rejection-reason"
                label="Rejection Reason (required to reject)"
                placeholder="Reason for rejecting this ticket…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                resize="none"
              />
              <Textarea
                id="mgr-status-note"
                name="mgr-status-note"
                label="Optional note"
                placeholder="Additional note for the status change…"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={2}
                resize="none"
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => { void handleStatusChange('RESOLVED'); }}
                  loading={statusSubmitting}
                  disabled={!resolutionNotes.trim()}
                >
                  Mark Resolved
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => { void handleStatusChange('CLOSED'); }}
                  loading={statusSubmitting}
                >
                  Close Ticket
                </Button>
                <Button
                  variant="danger"
                  onClick={() => { void handleStatusChange('REJECTED'); }}
                  loading={statusSubmitting}
                  disabled={!rejectionReason.trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {ticket.status === 'RESOLVED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ticket.resolutionNotes && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  Resolution notes: <em style={{ color: 'var(--text-body)' }}>{ticket.resolutionNotes}</em>
                </p>
              )}
              <Button
                variant="subtle"
                onClick={() => { void handleStatusChange('CLOSED'); }}
                loading={statusSubmitting}
              >
                Close Ticket
              </Button>
            </div>
          )}
        </Card>
      )}

      {isFinal && (
        <Alert
          variant={ticket.status === 'REJECTED' ? 'error' : 'neutral'}
          title={`Ticket ${ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}`}
        >
          {ticket.status === 'REJECTED' && ticket.rejectionReason
            ? ticket.rejectionReason
            : ticket.status === 'RESOLVED' && ticket.resolutionNotes
            ? ticket.resolutionNotes
            : `This ticket has been ${ticket.status.toLowerCase()}.`}
        </Alert>
      )}

      <Card>
        <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>
          Description
        </p>
        <p style={{ margin: 0, color: 'var(--text-body)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </p>
        {ticket.contactNote && (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Contact note: <em style={{ color: 'var(--text-body)' }}>{ticket.contactNote}</em>
          </p>
        )}
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <Tabs
            variant="underline"
            tabs={[
              { label: `Comments${!canComment ? ' 🔒' : ''}`, value: 'comments', badge: comments.length },
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
              {!canComment && (
                <Alert variant="info" title="Comments locked">
                  {isFinal
                    ? `Comments are disabled for ${ticket.status === 'CLOSED' ? 'closed' : 'rejected'} tickets.`
                    : 'Accept the ticket first to enable comments.'}
                </Alert>
              )}
              {comments.length === 0 && canComment && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No comments yet.</p>
              )}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{comment.userEmail}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(comment.createdAt)}</span>
                    {comment.isEdited && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {comment.commentText}
                  </p>
                </div>
              ))}
              {canComment && (
                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <Textarea
                    id="mgr-comment"
                    name="mgr-comment"
                    label="Add a comment"
                    placeholder="Write your comment here…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    resize="none"
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" loading={commentSubmitting} size="sm">Add Comment</Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {attachments.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No attachments.</p>}
              {attachments.map((a) => (
                <div
                  key={a.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <Paperclip size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500, textDecoration: 'underline', wordBreak: 'break-all' }}>
                      {a.fileName}
                    </a>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{a.fileType} · {formatDateTime(a.uploadedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No history available.</p>}
              {history.map((entry) => (
                <div
                  key={entry.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {entry.oldStatus && (
                        <>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{entry.oldStatus.replace('_', ' ')}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                        </>
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-h)', fontWeight: 700 }}>{entry.newStatus.replace('_', ' ')}</span>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>by <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.changedByEmail}</span></span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {formatDateTime(entry.changedAt)}</span>
                    </div>
                    {entry.note && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{entry.note}</p>}
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
