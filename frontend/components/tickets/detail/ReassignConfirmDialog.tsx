import React from 'react';
import { Button, Dialog } from '@/components/ui';

interface ReassignConfirmDialogProps {
  open: boolean;
  currentAssigneeName: string;
  newAssigneeName: string;
  assigning: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReassignConfirmDialog({
  open,
  currentAssigneeName,
  newAssigneeName,
  assigning,
  onClose,
  onConfirm,
}: ReassignConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Reassign Ticket?" size="sm">
      <div style={{ padding: '20px 24px' }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          This ticket is currently assigned to{' '}
          <strong style={{ color: 'var(--text-h)' }}>{currentAssigneeName}</strong>.
          Reassigning to{' '}
          <strong style={{ color: 'var(--text-h)' }}>{newAssigneeName}</strong>{' '}
          will notify them and change the assignee.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={assigning}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={assigning} onClick={onConfirm}>
            Confirm Reassign
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
