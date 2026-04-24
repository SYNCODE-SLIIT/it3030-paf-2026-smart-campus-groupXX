'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button, Dialog } from '@/components/ui';

type ButtonVariant = 'primary' | 'danger' | 'glass' | 'subtle' | 'success' | 'info';
type AlertVariant = 'error' | 'success' | 'warning' | 'info' | 'neutral';

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  confirmIcon,
  loading = false,
  disabled = false,
  alertVariant,
  errorMessage,
  children,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  confirmIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  alertVariant?: AlertVariant;
  errorMessage?: string | null;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const handleClose = React.useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} title={title} size="sm" closeOnBackdropClick={!loading}>
      <div style={{ display: 'grid', gap: 16, padding: '20px 24px' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--orange-400)' }}>
            <AlertTriangle size={16} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-h)' }}>
              Confirm Action
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.65 }}>
            {description}
          </p>
        </div>

        {children}

        {errorMessage && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--red-500)' }}>
            {errorMessage}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" disabled={loading} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            loading={loading}
            disabled={disabled}
            iconLeft={confirmIcon}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
