import React from 'react';
import { Button } from '@/components/ui';
import type { TicketResponse } from '@/lib/api-types';
import { SEC_HD_LABEL } from './ticketDetailHelpers';

interface TicketActionsCardProps {
  ticket: TicketResponse;
  statusSubmitting: boolean;
  onAccept: () => void;
  onResolveOpen: () => void;
  onClose: () => void;
  onRejectOpen: () => void;
}

export function TicketActionsCard({
  ticket,
  statusSubmitting,
  onAccept,
  onResolveOpen,
  onClose,
  onRejectOpen,
}: TicketActionsCardProps) {
  const { status } = ticket;

  if (status === 'CLOSED' || status === 'REJECTED') return null;

  const buttons = (
    <>
      {status === 'OPEN' && (
        <Button fullWidth size="sm" onClick={onAccept} loading={statusSubmitting}>
          Accept Ticket
        </Button>
      )}
      {status === 'IN_PROGRESS' && (
        <>
          <Button fullWidth variant="success" size="sm" onClick={onResolveOpen} loading={statusSubmitting}>
            Mark Resolved
          </Button>
          <Button fullWidth variant="subtle" size="sm" onClick={onClose} loading={statusSubmitting}>
            Close Ticket
          </Button>
          <Button fullWidth variant="danger" size="sm" onClick={onRejectOpen} loading={statusSubmitting}>
            Reject
          </Button>
        </>
      )}
      {status === 'RESOLVED' && (
        <Button fullWidth variant="subtle" size="sm" onClick={onClose} loading={statusSubmitting}>
          Close Ticket
        </Button>
      )}
    </>
  );

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
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={SEC_HD_LABEL}>Actions</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {buttons}
      </div>
    </div>
  );
}
