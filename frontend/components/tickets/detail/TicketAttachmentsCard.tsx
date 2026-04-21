'use client';

import React from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import type { TicketAttachmentResponse } from '@/lib/api-types';
import { SEC_HD_LABEL, formatDateTime, isImageAttachment } from './ticketDetailHelpers';

interface TicketAttachmentsCardProps {
  attachments: TicketAttachmentResponse[];
  canUpload?: boolean;
  canDelete?: boolean;
  maxAttachments?: number;
  attachmentUploading?: boolean;
  deletingAttachmentId?: string | null;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete?: (id: string, fileName: string) => void;
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

export function TicketAttachmentsCard({
  attachments,
  canUpload = false,
  canDelete = false,
  maxAttachments,
  attachmentUploading = false,
  deletingAttachmentId = null,
  onUpload,
  onDelete,
}: TicketAttachmentsCardProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const atMax = maxAttachments !== undefined && attachments.length >= maxAttachments;

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
        <span style={SEC_HD_LABEL}>Attachments</span>
        <CountPill count={attachments.length} />
        {canUpload && !atMax && onUpload && (
          <div style={{ marginLeft: 'auto' }}>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onUpload} />
            <Button
              variant="ghost"
              size="xs"
              loading={attachmentUploading}
              iconLeft={<Upload size={11} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {attachments.length === 0 && (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No attachments yet.</p>
        )}

        {attachments.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {attachments.map((a) =>
              isImageAttachment(a.fileName, a.fileType) ? (
                <div key={a.id} style={{ position: 'relative' }}>
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      background: 'var(--surface-2)',
                      textDecoration: 'none',
                    }}
                  >
                    <img
                      src={a.fileUrl}
                      alt={a.fileName}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.fileName}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{formatDateTime(a.uploadedAt)}</p>
                    </div>
                  </a>
                  {canDelete && onDelete && (
                    <div style={{ position: 'absolute', top: 6, right: 6 }}>
                      <Button
                        variant="ghost-danger"
                        size="xs"
                        loading={deletingAttachmentId === a.id}
                        iconLeft={<Trash2 size={11} />}
                        onClick={() => onDelete(a.id, a.fileName)}
                      >
                        Del
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={a.id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Paperclip size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-h)', textDecoration: 'underline', wordBreak: 'break-all', display: 'block' }}
                      >
                        {a.fileName}
                      </a>
                      <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                        {a.fileType} · {formatDateTime(a.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  {canDelete && onDelete && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="ghost-danger"
                        size="xs"
                        loading={deletingAttachmentId === a.id}
                        iconLeft={<Trash2 size={11} />}
                        onClick={() => onDelete(a.id, a.fileName)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {atMax && (
          <p style={{ margin: attachments.length > 0 ? '12px 0 0' : 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Maximum of {maxAttachments} attachments reached.
          </p>
        )}
      </div>
    </div>
  );
}
