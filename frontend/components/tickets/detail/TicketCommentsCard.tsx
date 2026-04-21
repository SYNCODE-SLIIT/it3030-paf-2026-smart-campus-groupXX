import React from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import { Alert, Button, Textarea } from '@/components/ui';
import type { TicketCommentResponse } from '@/lib/api-types';
import { SEC_HD_LABEL, formatDateTime } from './ticketDetailHelpers';

interface TicketCommentsCardProps {
  comments: TicketCommentResponse[];
  canComment: boolean;
  commentLockReason?: string;
  commentText: string;
  commentSubmitting: boolean;
  onCommentChange: (text: string) => void;
  onCommentSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  formIdPrefix: string;
  currentUserId?: string;
  canDeleteAny?: boolean;
  onDeleteComment?: (commentId: string) => void;
  commentDeleting?: string | null;
  onEditComment?: (commentId: string, newText: string) => Promise<void>;
}

function CountPill({ count }: { count: number }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--text-muted)',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '2px 7px',
      }}
    >
      {count}
    </span>
  );
}

function IconBtn({
  onClick,
  disabled,
  danger,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      style={{
        background: hovered && !disabled
          ? danger
            ? 'rgba(239,68,68,0.08)'
            : 'var(--surface-3, rgba(0,0,0,0.06))'
          : 'none',
        border: 'none',
        borderRadius: 'var(--radius-sm, 4px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '2px 4px',
        color: hovered && !disabled
          ? danger ? 'var(--color-error, #ef4444)' : 'var(--text-body)'
          : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

export function TicketCommentsCard({
  comments,
  canComment,
  commentLockReason,
  commentText,
  commentSubmitting,
  onCommentChange,
  onCommentSubmit,
  formIdPrefix,
  currentUserId,
  canDeleteAny,
  onDeleteComment,
  commentDeleting,
  onEditComment,
}: TicketCommentsCardProps) {
  const lastCommentId = comments.length > 0 ? comments[comments.length - 1].id : null;
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  function startEdit(comment: TicketCommentResponse) {
    setEditingId(comment.id);
    setEditText(comment.commentText);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function submitEdit(commentId: string) {
    if (!onEditComment || !editText.trim()) return;
    setEditSubmitting(true);
    try {
      await onEditComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={SEC_HD_LABEL}>Comments</span>
        <CountPill count={comments.length} />
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!canComment && commentLockReason && (
          <Alert variant="info" title="Comments locked">{commentLockReason}</Alert>
        )}

        {comments.length === 0 && canComment && (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No comments yet.</p>
        )}

        {comments.map((comment) => {
          const isLast = comment.id === lastCommentId;
          const isAuthor = comment.userId === currentUserId;
          const canEdit = isLast && isAuthor && !!onEditComment;
          const canDelete = isLast && (canDeleteAny || isAuthor) && !!onDeleteComment;
          const isEditing = editingId === comment.id;

          return (
            <div
              key={comment.id}
              style={{
                padding: 14,
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {comment.userEmail}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(comment.createdAt)}</span>
                {comment.isEdited && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>
                )}
                {(canEdit || canDelete) && !isEditing && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    {canEdit && (
                      <IconBtn onClick={() => startEdit(comment)} label="Edit comment">
                        <Pencil size={13} />
                      </IconBtn>
                    )}
                    {canDelete && (
                      <IconBtn
                        onClick={() => onDeleteComment!(comment.id)}
                        disabled={commentDeleting === comment.id}
                        danger
                        label="Delete comment"
                      >
                        <Trash2 size={13} />
                      </IconBtn>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Textarea
                    id={`edit-comment-${comment.id}`}
                    name={`edit-comment-${comment.id}`}
                    label=""
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    resize="none"
                    required
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <Button type="button" variant="ghost" size="sm" iconLeft={<X size={13} />} onClick={cancelEdit} disabled={editSubmitting}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      iconLeft={<Check size={13} />}
                      loading={editSubmitting}
                      disabled={!editText.trim() || editText.trim() === comment.commentText}
                      onClick={() => submitEdit(comment.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {comment.commentText}
                </p>
              )}
            </div>
          );
        })}

        {canComment && (
          <form
            onSubmit={onCommentSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: comments.length > 0 ? 4 : 0 }}
          >
            <Textarea
              id={`${formIdPrefix}-comment`}
              name={`${formIdPrefix}-comment`}
              label="Add a comment"
              placeholder="Write your comment here…"
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
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
    </div>
  );
}
