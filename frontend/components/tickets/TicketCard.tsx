'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Clock, Trash2, User } from 'lucide-react';
import { Button, Chip } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';
import { computeSlaBadge } from '@/lib/sla';

interface AssignOption {
  id: string;
  label: string;
}

interface TicketCardProps {
  ticket: TicketSummaryResponse;
  onView: () => void;
  showReporter?: boolean;
  showSlaBadge?: boolean;
  assignOptions?: AssignOption[];
  onAssign?: (userId: string) => void;
  onDelete?: () => void;
}

type AssignMenuPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICAL: 'Electrical',
  NETWORK: 'Network',
  EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture',
  CLEANLINESS: 'Cleanliness',
  FACILITY_DAMAGE: 'Facility Damage',
  ACCESS_SECURITY: 'Access / Security',
  OTHER: 'Other',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const PRIORITY_STRIPE: Record<TicketPriority, string> = {
  LOW: 'var(--neutral-400)',
  MEDIUM: 'var(--blue-400)',
  HIGH: 'var(--orange-400)',
  URGENT: 'var(--red-400)',
};

const PRIORITY_CHIP_COLOR: Record<TicketPriority, 'neutral' | 'blue' | 'orange' | 'red'> = {
  LOW: 'neutral',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

type SegColor = [string, string, string];

const STATUS_SEGS: Record<TicketStatus, SegColor> = {
  OPEN:        ['var(--blue-400)',    'var(--border)', 'var(--border)'],
  IN_PROGRESS: ['var(--yellow-400)', 'var(--yellow-400)', 'var(--border)'],
  RESOLVED:    ['var(--green-400)',   'var(--green-400)', 'var(--green-400)'],
  CLOSED:      ['var(--neutral-300)', 'var(--neutral-300)', 'var(--neutral-300)'],
  REJECTED:    ['var(--red-400)',     'var(--border)', 'var(--border)'],
};

const STATUS_LABEL_COLOR: Record<TicketStatus, string> = {
  OPEN:        'var(--blue-500)',
  IN_PROGRESS: 'var(--yellow-600)',
  RESOLVED:    'var(--green-600)',
  CLOSED:      'var(--text-muted)',
  REJECTED:    'var(--red-500)',
};

const STATUS_DISPLAY: Record<TicketStatus, string> = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
  REJECTED:    'Rejected',
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

export function TicketCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 320,
        maxWidth: 340,
      }}
    >
      {/* Priority stripe */}
      <Skeleton variant="rect" height={3} style={{ borderRadius: 0 }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <Skeleton width={52} height={9} />
            <Skeleton width={64} height={18} style={{ borderRadius: 'var(--radius-sm)' }} />
          </div>
          <Skeleton width="80%" height={13} />
          <Skeleton width="100%" height={10} />
          <Skeleton width="65%" height={10} />
        </div>
        <Skeleton width={52} height={18} style={{ borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
      </div>

      {/* Status track */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', gap: 3 }}>
          <Skeleton variant="rect" height={3} style={{ flex: 1, borderRadius: 2 }} />
          <Skeleton variant="rect" height={3} style={{ flex: 1, borderRadius: 2 }} />
          <Skeleton variant="rect" height={3} style={{ flex: 1, borderRadius: 2 }} />
        </div>
        <Skeleton width={48} height={8} />
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton width={90} height={9} />
          <Skeleton width={56} height={9} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="circle" width={20} height={20} />
          <Skeleton width={44} height={24} style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
    </div>
  );
}

export function TicketsSectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Skeleton variant="rect" width={3} height={16} style={{ borderRadius: 2, flexShrink: 0 }} />
        <Skeleton width={80} height={10} />
        <Skeleton width={16} height={10} />
      </div>
      {/* Cards row */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          padding: '18px 24px 36px',
          margin: '-18px -24px -24px',
          scrollbarWidth: 'thin',
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ flexShrink: 0 }}>
            <TicketCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TicketCard({ ticket, onView, showReporter = false, showSlaBadge = false, assignOptions, onAssign, onDelete }: TicketCardProps) {
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignMenuPosition, setAssignMenuPosition] = React.useState<AssignMenuPosition | null>(null);
  const assignRef = React.useRef<HTMLDivElement>(null);
  const assignButtonRef = React.useRef<HTMLButtonElement>(null);
  const assignMenuRef = React.useRef<HTMLDivElement>(null);
  const segs = STATUS_SEGS[ticket.status];
  const slaBadge = showSlaBadge ? computeSlaBadge(ticket) : null;

  const updateAssignMenuPosition = React.useCallback(() => {
    const button = assignButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportInset = 12;
    const gap = 6;
    const width = Math.min(240, Math.max(190, window.innerWidth - viewportInset * 2));
    const left = Math.min(
      Math.max(viewportInset, rect.left),
      window.innerWidth - width - viewportInset,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportInset;
    const spaceAbove = rect.top - viewportInset;
    const shouldOpenUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const available = Math.max(80, (shouldOpenUp ? spaceAbove : spaceBelow) - gap);

    setAssignMenuPosition({
      left,
      width,
      maxHeight: Math.min(260, available),
      ...(shouldOpenUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, []);

  React.useEffect(() => {
    if (!assignOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        assignRef.current?.contains(target) ||
        assignMenuRef.current?.contains(target)
      ) {
        return;
      }
      setAssignOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAssignOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [assignOpen]);

  React.useEffect(() => {
    if (!assignOpen) {
      setAssignMenuPosition(null);
      return;
    }

    updateAssignMenuPosition();
    window.addEventListener('resize', updateAssignMenuPosition);
    window.addEventListener('scroll', updateAssignMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateAssignMenuPosition);
      window.removeEventListener('scroll', updateAssignMenuPosition, true);
    };
  }, [assignOpen, updateAssignMenuPosition]);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--card-shadow)',
        transition: 'box-shadow .22s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Priority stripe */}
      <div style={{ height: 3, background: PRIORITY_STRIPE[ticket.priority], borderTopLeftRadius: 'var(--radius-md)', borderTopRightRadius: 'var(--radius-md)' }} />

      {/* Header */}
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, width: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '.04em',
              }}
            >
              {ticket.ticketCode}
            </span>
            <Chip size="sm" color="neutral">
              {CATEGORY_LABELS[ticket.category] ?? ticket.category}
            </Chip>
          </div>
          <p
            style={{
              margin: '0 0 5px',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              color: 'var(--text-h)',
            }}
          >
            {ticket.title}
          </p>
          {/* Always reserves 2-line height so cards align regardless of description length */}
          <p
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.55,
              color: 'var(--text-body)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: '34px',
              width: '100%',
            }}
          >
            {ticket.description}
          </p>
        </div>
        <Chip color={PRIORITY_CHIP_COLOR[ticket.priority]} size="sm" dot style={{ flexShrink: 0, marginTop: 1 }}>
          {PRIORITY_LABELS[ticket.priority]}
        </Chip>
      </div>

      {/* Status track */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ flex: 1, display: 'flex', gap: 3 }}>
          {segs.map((color, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                background: color,
                transition: 'background .3s',
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: '.10em',
            textTransform: 'uppercase',
            color: STATUS_LABEL_COLOR[ticket.status],
            flexShrink: 0,
          }}
        >
          {STATUS_DISPLAY[ticket.status]}
        </span>
      </div>

      {/* SLA badge */}
      {slaBadge && slaBadge !== 'ON_TRACK' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 16px',
            background: slaBadge === 'BREACHED' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
            borderBottom: `1px solid ${slaBadge === 'BREACHED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
          }}
        >
          <Clock size={9} style={{ color: slaBadge === 'BREACHED' ? 'var(--red-500)' : 'var(--yellow-600)', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '.10em',
              textTransform: 'uppercase',
              color: slaBadge === 'BREACHED' ? 'var(--red-500)' : 'var(--yellow-600)',
            }}
          >
            {slaBadge === 'BREACHED' ? 'SLA Breached' : 'SLA At Risk'}
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 16px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {/* Row 1: reporter (optional) + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {showReporter ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
              <User size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.45 }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 130,
                }}
              >
                {ticket.reportedByEmail}
              </span>
            </div>
          ) : (
            <div />
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'var(--text-muted)',
              flexShrink: 0,
              letterSpacing: '.02em',
              opacity: 0.8,
            }}
          >
            {formatDate(ticket.createdAt)}
          </span>
        </div>

        {/* Row 2: assignee avatar / assign button + view button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {ticket.assignedToName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--blue-400)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 6.5,
                  fontWeight: 600,
                  color: '#fff',
                  flexShrink: 0,
                  border: '1.5px solid var(--surface)',
                }}
              >
                {getInitials(ticket.assignedToName)}
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  color: 'var(--text-body)',
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ticket.assignedToName}
              </span>
            </div>
          ) : assignOptions && assignOptions.length > 0 && onAssign ? (
            <div ref={assignRef} style={{ position: 'relative' }}>
              <button
                ref={assignButtonRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setAssignOpen((v) => !v); }}
                aria-haspopup="menu"
                aria-expanded={assignOpen}
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  cursor: 'pointer',
                }}
              >
                + Assign
              </button>
              {assignOpen && typeof document !== 'undefined' && createPortal(
                <div
                  ref={assignMenuRef}
                  role="menu"
                  style={{
                    position: 'fixed',
                    left: assignMenuPosition?.left ?? 0,
                    width: assignMenuPosition?.width ?? 220,
                    ...(assignMenuPosition?.bottom !== undefined
                      ? { bottom: assignMenuPosition.bottom }
                      : { top: assignMenuPosition?.top ?? 0 }),
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--card-shadow-hover)',
                    maxHeight: assignMenuPosition?.maxHeight ?? 260,
                    zIndex: 1000,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    visibility: assignMenuPosition ? 'visible' : 'hidden',
                  }}
                >
                  {assignOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitem"
                      onClick={(e) => { e.stopPropagation(); onAssign(opt.id); setAssignOpen(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '7px 12px',
                        fontSize: 11,
                        color: 'var(--text-body)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover, rgba(0,0,0,0.04))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                ,
                document.body,
              )}
            </div>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onDelete && (
              <button
                type="button"
                aria-label="Delete ticket"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--red-500)',
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <Trash2 size={13} />
              </button>
            )}
            <Button variant="ghost" size="xs" onClick={onView}>
              View
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
