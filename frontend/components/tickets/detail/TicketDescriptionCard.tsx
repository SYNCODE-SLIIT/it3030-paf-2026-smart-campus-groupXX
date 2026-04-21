import React from 'react';
import { SEC_HD_LABEL } from './ticketDetailHelpers';

interface TicketDescriptionCardProps {
  description: string;
}

export function TicketDescriptionCard({ description }: TicketDescriptionCardProps) {
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
        <span style={SEC_HD_LABEL}>Description</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            lineHeight: 1.75,
            color: 'var(--text-body)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
