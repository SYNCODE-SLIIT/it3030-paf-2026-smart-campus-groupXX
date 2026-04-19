import React from 'react';
import { User } from 'lucide-react';
import { Button, Chip } from '@/components/ui';
import type { TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

interface AssignOption {
  id: string;
  label: string;
}

interface TicketCardProps {
  ticket: TicketSummaryResponse;
  onView: () => void;
  showReporter?: boolean;
  assignOptions?: AssignOption[];
  onAssign?: (userId: string) => void;
}

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

export function TicketCard({ ticket, onView, showReporter = false, assignOptions, onAssign }: TicketCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const assignRef = React.useRef<HTMLDivElement>(null);
  const segs = STATUS_SEGS[ticket.status];

  React.useEffect(() => {
    if (!assignOpen) return;
    const handler = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [assignOpen]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: hovered ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform .22s ease, box-shadow .22s ease',
        position: 'relative',
        overflow: assignOpen ? 'visible' : 'hidden',
        zIndex: assignOpen ? 10 : 'auto',
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
                onClick={(e) => { e.stopPropagation(); setAssignOpen((v) => !v); }}
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
              {assignOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--card-shadow-hover)',
                    minWidth: 170,
                    zIndex: 200,
                    overflow: 'hidden',
                  }}
                >
                  {assignOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { onAssign(opt.id); setAssignOpen(false); }}
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
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover, rgba(0,0,0,0.04))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
          <Button variant="ghost" size="xs" onClick={onView}>
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
