import React from 'react';
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

export function TicketCommentsCard({
  comments,
  canComment,
  commentLockReason,
  commentText,
  commentSubmitting,
  onCommentChange,
  onCommentSubmit,
  formIdPrefix,
}: TicketCommentsCardProps) {
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

        {comments.map((comment) => (
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
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {comment.commentText}
            </p>
          </div>
        ))}

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
