import React from 'react';
import type { TicketStatusHistoryResponse } from '@/lib/api-types';
import { SEC_HD_LABEL, formatDateTime, statusChipColor } from './ticketDetailHelpers';

interface TicketHistoryCardProps {
  history: TicketStatusHistoryResponse[];
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

const DOT_COLOR: Record<string, string> = {
  blue:    'var(--blue-400)',
  yellow:  'var(--yellow-400)',
  green:   'var(--green-400)',
  neutral: 'var(--neutral-400)',
  red:     'var(--red-400)',
};

export function TicketHistoryCard({ history }: TicketHistoryCardProps) {
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
        <span style={SEC_HD_LABEL}>History</span>
        <CountPill count={history.length} />
      </div>

      <div style={{ padding: '16px 20px', maxHeight: 340, overflowY: 'auto' }}>
        {history.length === 0 && (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>No history available.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {history.map((entry, i) => {
            const color = DOT_COLOR[statusChipColor(entry.newStatus)];
            const isLast = i === history.length - 1;
            return (
              <div key={entry.id} style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 12 }}>
                {/* Dot + connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      border: `1.5px solid ${color}`,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  {!isLast && (
                    <div
                      style={{
                        width: 1.5,
                        flex: 1,
                        background: 'var(--border)',
                        marginTop: 4,
                        minHeight: 16,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    {entry.oldStatus && (
                      <>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {entry.oldStatus.replace('_', ' ')}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                      </>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.08em',
                        color,
                      }}
                    >
                      {entry.newStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    by{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{entry.changedByEmail}</span>
                  </p>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
                    {formatDateTime(entry.changedAt)}
                  </span>
                  {entry.note && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {entry.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
