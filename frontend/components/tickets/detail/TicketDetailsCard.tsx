import React from 'react';
import { Avatar } from '@/components/ui';
import type { TicketResponse } from '@/lib/api-types';
import { SEC_HD_LABEL, getInitials, splitDateTime } from './ticketDetailHelpers';

interface TicketDetailsCardProps {
  ticket: TicketResponse;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-body)' }}>
        {children}
      </span>
    </div>
  );
}

function DateValue({ iso }: { iso: string }) {
  const [date, time] = splitDateTime(iso);
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-body)' }}>{date}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>{time}</span>
    </span>
  );
}

export function TicketDetailsCard({ ticket }: TicketDetailsCardProps) {
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
        }}
      >
        <span style={SEC_HD_LABEL}>Details</span>
      </div>

      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Assigned To */}
        <DetailRow label="Assigned To">
          {ticket.assignedToName ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="xs" initials={getInitials(ticket.assignedToName)} />
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-body)' }}>
                {ticket.assignedToName}
              </span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-block',
                border: '1.5px dashed var(--border-strong)',
                borderRadius: 999,
                padding: '2px 10px',
                fontSize: 11,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                width: 'fit-content',
              }}
            >
              Unassigned
            </span>
          )}
        </DetailRow>

        {/* Reporter */}
        <div style={{ paddingTop: 12 }}>
          <DetailRow label="Reporter">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all' }}>
              {ticket.reportedByEmail}
            </span>
          </DetailRow>
        </div>

        {/* Opened */}
        <div style={{ paddingTop: 12 }}>
          <DetailRow label="Opened">
            <DateValue iso={ticket.createdAt} />
          </DetailRow>
        </div>

        {/* Last Updated */}
        <div style={{ paddingTop: 12 }}>
          {ticket.resolvedAt || ticket.closedAt || ticket.contactNote ? (
            <DetailRow label="Last Updated">
              <DateValue iso={ticket.updatedAt} />
            </DetailRow>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Last Updated
              </span>
              <DateValue iso={ticket.updatedAt} />
            </div>
          )}
        </div>

        {ticket.resolvedAt && (
          <div style={{ paddingTop: 12 }}>
            <DetailRow label="Resolved">
              <DateValue iso={ticket.resolvedAt} />
            </DetailRow>
          </div>
        )}

        {ticket.closedAt && (
          <div style={{ paddingTop: 12 }}>
            <DetailRow label="Closed">
              <DateValue iso={ticket.closedAt} />
            </DetailRow>
          </div>
        )}

        {ticket.contactNote && (
          <div style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Contact
              </span>
              <em style={{ fontSize: 12.5, color: 'var(--text-body)' }}>{ticket.contactNote}</em>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
