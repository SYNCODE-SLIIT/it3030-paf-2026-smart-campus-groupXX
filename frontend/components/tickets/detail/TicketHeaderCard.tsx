import React from 'react';
import { Chip } from '@/components/ui';
import type { TicketResponse } from '@/lib/api-types';
import {
  CATEGORY_LABELS,
  PRIORITY_CHIP_COLOR,
  PRIORITY_LABELS,
  PRIORITY_STRIPE,
  STATUS_DISPLAY,
  statusChipColor,
} from './ticketDetailHelpers';

interface TicketHeaderCardProps {
  ticket: TicketResponse;
  assignmentSlot?: React.ReactNode;
}

export function TicketHeaderCard({ ticket, assignmentSlot }: TicketHeaderCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: `inset 4px 0 0 ${PRIORITY_STRIPE[ticket.priority]}, var(--card-shadow)`,
      }}
    >
      {/* Inner content */}
      <div style={{ padding: '20px 24px 20px 28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p
              style={{
                margin: 0,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Chip color={statusChipColor(ticket.status)} dot>
                {STATUS_DISPLAY[ticket.status]}
              </Chip>
              <Chip color={PRIORITY_CHIP_COLOR[ticket.priority]}>
                {PRIORITY_LABELS[ticket.priority]}
              </Chip>
              <Chip color="neutral">
                {CATEGORY_LABELS[ticket.category] ?? ticket.category}
              </Chip>
            </div>
          </div>
          {assignmentSlot && <div style={{ flexShrink: 0 }}>{assignmentSlot}</div>}
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--text-h)',
          }}
        >
          {ticket.title}
        </h1>
      </div>
    </div>
  );
}
