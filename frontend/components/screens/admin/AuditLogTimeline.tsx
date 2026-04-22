'use client';

import React from 'react';
import {
  Ban,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
} from 'lucide-react';

import { Button, Chip } from '@/components/ui';
import type { AdminAction, AuditLogResponse } from '@/lib/api-types';

type TimelineProps = {
  logs: AuditLogResponse[];
  expandedIds: Set<string>;
  onToggleDetails: (id: string) => void;
  emptyMessage?: string;
};

type ActionVisual = {
  label: string;
  color: 'yellow' | 'red' | 'green' | 'blue' | 'orange' | 'neutral' | 'glass';
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
};

function actionVisual(action: AdminAction): ActionVisual {
  switch (action) {
    case 'USER_CREATED':
      return { label: 'User Created', color: 'blue', icon: UserPlus };
    case 'USER_UPDATED':
      return { label: 'User Updated', color: 'glass', icon: UserCog };
    case 'USER_SUSPENDED':
      return { label: 'User Suspended', color: 'orange', icon: Ban };
    case 'USER_ACTIVATED':
      return { label: 'User Activated', color: 'green', icon: CheckCircle2 };
    case 'USER_DELETED':
      return { label: 'User Deleted', color: 'red', icon: Trash2 };
    case 'INVITE_RESENT':
      return { label: 'Invite Resent', color: 'yellow', icon: Mail };
    case 'MANAGER_ROLE_CHANGED':
      return { label: 'Manager Role Changed', color: 'blue', icon: ShieldCheck };
  }
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown time';

  const diffMs = timestamp - Date.now();
  const absMs = Math.abs(diffMs);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absMs < hour) {
    return formatter.format(Math.round(diffMs / minute), 'minute');
  }
  if (absMs < day) {
    return formatter.format(Math.round(diffMs / hour), 'hour');
  }
  return formatter.format(Math.round(diffMs / day), 'day');
}

function tryParseDetails(details: string | null): unknown {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}

function renderDetailValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--text-muted)' }}>null</span>;
  }

  if (typeof value === 'object') {
    if (!Array.isArray(value) && 'old' in (value as Record<string, unknown>) && 'new' in (value as Record<string, unknown>)) {
      const change = value as { old: unknown; new: unknown };
      return (
        <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)' }}>{String(change.old ?? 'null')}</span>
          <span aria-hidden style={{ color: 'var(--text-muted)' }}>→</span>
          <strong style={{ color: 'var(--text-h)', fontWeight: 700 }}>{String(change.new ?? 'null')}</strong>
        </span>
      );
    }

    return <code style={{ color: 'var(--text-body)', fontSize: 12 }}>{JSON.stringify(value)}</code>;
  }

  return <span>{String(value)}</span>;
}

function DetailsPanel({ details }: { details: string | null }) {
  const parsed = tryParseDetails(details);

  if (!parsed) {
    return <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>No additional details.</p>;
  }

  if (typeof parsed === 'string') {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-body)',
        }}
      >
        {parsed}
      </pre>
    );
  }

  if (Array.isArray(parsed)) {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-body)',
        }}
      >
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  }

  const objectEntries = Object.entries(parsed as Record<string, unknown>);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {objectEntries.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(140px, 220px) minmax(0, 1fr)',
            gap: 10,
            alignItems: 'start',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            {key}
          </span>
          <div style={{ fontSize: 12.5, color: 'var(--text-body)', overflowWrap: 'anywhere' }}>{renderDetailValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogTimeline({ logs, expandedIds, onToggleDetails, emptyMessage = 'No activity found.' }: TimelineProps) {
  if (!logs.length) {
    return <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{emptyMessage}</p>;
  }

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 12 }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 8,
          bottom: 8,
          left: 16,
          width: 2,
          background: 'linear-gradient(180deg, rgba(238,202,68,.45), rgba(238,202,68,.08))',
          borderRadius: 999,
        }}
      />

      {logs.map((entry) => {
        const visual = actionVisual(entry.action);
        const Icon = visual.icon;
        const expanded = expandedIds.has(entry.id);

        return (
          <div
            key={entry.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)',
              padding: 12,
              marginLeft: 32,
              display: 'grid',
              gap: 10,
              position: 'relative',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: -24,
                top: 13,
                width: 16,
                height: 16,
                borderRadius: 999,
                border: '1px solid rgba(238,202,68,.4)',
                background: 'color-mix(in srgb, var(--surface) 88%, rgba(238,202,68,.22))',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock3 size={9} strokeWidth={2.2} color="var(--yellow-700)" />
            </span>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <Icon size={14} strokeWidth={2.2} color="var(--yellow-700)" />
                  </span>
                  <Chip color={visual.color} dot>
                    {visual.label}
                  </Chip>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-h)', fontWeight: 700 }}>{entry.performedByEmail}</strong>
                  {' performed '}
                  <strong style={{ color: 'var(--text-h)', fontWeight: 700 }}>{visual.label}</strong>
                  {' on '}
                  <strong style={{ color: 'var(--text-h)', fontWeight: 700 }}>{entry.targetUserEmail}</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{formatRelativeTime(entry.createdAt)}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(entry.createdAt)}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onToggleDetails(entry.id)}
                aria-expanded={expanded}
              >
                {expanded ? 'Hide details' : 'View details'}
              </Button>
            </div>

            {expanded && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  padding: 10,
                }}
              >
                <DetailsPanel details={entry.details} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
