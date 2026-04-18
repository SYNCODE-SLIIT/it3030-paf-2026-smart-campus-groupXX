import React from 'react';
import { User } from 'lucide-react';
import { Button, Chip } from '@/components/ui';
import type { TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

interface TicketCardProps {
  ticket: TicketSummaryResponse;
  onView: () => void;
  showReporter?: boolean;
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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

export function TicketCard({ ticket, onView, showReporter = false }: TicketCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const segs = STATUS_SEGS[ticket.status];

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
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Priority stripe */}
      <div style={{ height: 3, background: PRIORITY_STRIPE[ticket.priority] }} />

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
        <div style={{ flex: 1, minWidth: 0 }}>
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
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {showReporter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <User size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ticket.reportedByEmail}
            </span>
          </div>
        )}
        {ticket.assignedToName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <User size={10} style={{ color: 'var(--blue-400)', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Assigned: {ticket.assignedToName}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              color: 'var(--text-muted)',
            }}
          >
            {formatDate(ticket.createdAt)}
          </span>
          <Button variant="ghost" size="xs" onClick={onView}>
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
