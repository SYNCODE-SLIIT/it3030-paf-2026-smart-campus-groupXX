'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Alert, Button, Dialog } from '@/components/ui';

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
  alertVariant = 'warning',
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
      <div style={{ display: 'grid', gap: 16, padding: 20 }}>
        <Alert variant={alertVariant} title={title} icon={<AlertTriangle size={16} />}>
          {description}
        </Alert>

        {children}

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
