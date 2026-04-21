'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import type { TicketResponse, TicketStatusHistoryResponse } from '@/lib/api-types';
import { SLA_TTFR_MINUTES, SLA_TTR_MINUTES, formatSlaMinutes } from '@/lib/sla';

interface LifecycleMilestone {
  label: string;
  timestamp: string | null;
  durationLabel: string | null;
  slaTargetMinutes: number | null;
  slaState: 'MET' | 'BREACHED' | 'PENDING' | 'NA';
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function minutesBetween(from: string, to: string) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
}

function SlaIndicator({ state }: { state: LifecycleMilestone['slaState'] }) {
  if (state === 'MET') return <CheckCircle2 size={13} style={{ color: 'var(--green-500)', flexShrink: 0 }} />;
  if (state === 'BREACHED') return <XCircle size={13} style={{ color: 'var(--red-500)', flexShrink: 0 }} />;
  if (state === 'PENDING') return <Clock size={13} style={{ color: 'var(--yellow-600)', flexShrink: 0 }} />;
  return <Circle size={13} style={{ color: 'var(--border)', flexShrink: 0 }} />;
}

export function TicketLifecycleCard({
  ticket,
  history,
}: {
  ticket: TicketResponse;
  history: TicketStatusHistoryResponse[];
}) {
  const firstAcceptedEntry = history.find((h) => h.newStatus === 'IN_PROGRESS');
  const firstAcceptedAt = firstAcceptedEntry?.changedAt ?? null;

  const ttfrTargetMinutes = SLA_TTFR_MINUTES[ticket.priority];
  const ttrTargetMinutes = SLA_TTR_MINUTES[ticket.priority];

  let ttfrMinutes: number | null = null;
  let ttrMinutes: number | null = null;

  if (firstAcceptedAt) {
    ttfrMinutes = minutesBetween(ticket.createdAt, firstAcceptedAt);
  }
  if (ticket.resolvedAt) {
    ttrMinutes = minutesBetween(ticket.createdAt, ticket.resolvedAt);
  }

  const isActive = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';

  const ttfrState: LifecycleMilestone['slaState'] = firstAcceptedAt
    ? ttfrMinutes! <= ttfrTargetMinutes ? 'MET' : 'BREACHED'
    : isActive ? 'PENDING' : 'NA';

  const ttrState: LifecycleMilestone['slaState'] = ticket.resolvedAt
    ? ttrMinutes! <= ttrTargetMinutes ? 'MET' : 'BREACHED'
    : isActive ? 'PENDING' : 'NA';

  const milestones: LifecycleMilestone[] = [
    {
      label: 'Reported',
      timestamp: ticket.createdAt,
      durationLabel: null,
      slaTargetMinutes: null,
      slaState: 'NA',
    },
    {
      label: 'First Response',
      timestamp: firstAcceptedAt,
      durationLabel: ttfrMinutes != null ? formatSlaMinutes(ttfrMinutes) : null,
      slaTargetMinutes: ttfrTargetMinutes,
      slaState: ttfrState,
    },
    {
      label: 'Resolved',
      timestamp: ticket.resolvedAt,
      durationLabel: ttrMinutes != null ? formatSlaMinutes(ttrMinutes) : null,
      slaTargetMinutes: ttrTargetMinutes,
      slaState: ttrState,
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Clock size={18} color="var(--yellow-600)" />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
          Lifecycle
        </p>
      </div>
      <div style={{ display: 'grid', gap: 0 }}>
        {milestones.map((milestone, idx) => (
          <div key={milestone.label} style={{ display: 'flex', gap: 14, position: 'relative' }}>
            {/* Timeline connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: milestone.timestamp
                    ? 'var(--yellow-400)'
                    : 'var(--border)',
                  border: '2px solid var(--surface)',
                  boxShadow: '0 0 0 1.5px var(--border)',
                  flexShrink: 0,
                  marginTop: 3,
                  zIndex: 1,
                }}
              />
              {idx < milestones.length - 1 && (
                <div style={{ flex: 1, width: 1.5, background: 'var(--border)', minHeight: 28 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: idx < milestones.length - 1 ? 18 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {milestone.label}
                </span>
                {milestone.slaState !== 'NA' && <SlaIndicator state={milestone.slaState} />}
              </div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: milestone.timestamp ? 'var(--text-h)' : 'var(--text-muted)' }}>
                {milestone.timestamp ? formatTs(milestone.timestamp) : '—'}
              </p>
              {milestone.durationLabel != null && milestone.slaTargetMinutes != null && (
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: 11,
                    color: milestone.slaState === 'MET' ? 'var(--green-600)' : 'var(--red-500)',
                  }}
                >
                  {milestone.durationLabel} — {milestone.slaState === 'MET' ? 'within' : 'exceeded'} {formatSlaMinutes(milestone.slaTargetMinutes)} target
                </p>
              )}
              {milestone.slaState === 'PENDING' && milestone.slaTargetMinutes != null && (
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--yellow-600)' }}>
                  SLA target: {formatSlaMinutes(milestone.slaTargetMinutes)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
