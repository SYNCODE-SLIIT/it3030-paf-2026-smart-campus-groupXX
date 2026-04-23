'use client';

import React from 'react';
import { CalendarClock, Clock3, MapPin, UserRound } from 'lucide-react';

import { Button, Chip, Skeleton } from '@/components/ui';
import type { BookingResponse, BookingStatus, CheckInStatus, ResourceResponse } from '@/lib/api-types';
import { getResourceCategoryLabel } from '@/lib/resource-display';

interface BookingCardProps {
  booking: BookingResponse;
  resource?: ResourceResponse | null;
  showRequester?: boolean;
  actions?: React.ReactNode;
  onLocation?: () => void;
}

interface BookingSectionProps {
  label: string;
  color: string;
  count?: number;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CHECKED_IN: 'Checked In',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
};

const STATUS_STRIPE: Record<BookingStatus, string> = {
  PENDING: 'var(--yellow-400)',
  APPROVED: 'var(--green-400)',
  REJECTED: 'var(--red-400)',
  CANCELLED: 'var(--neutral-300)',
  CHECKED_IN: 'var(--blue-400)',
  COMPLETED: 'var(--blue-500)',
  NO_SHOW: 'var(--red-500)',
};

const STATUS_CHIP: Record<BookingStatus, 'yellow' | 'green' | 'red' | 'neutral' | 'blue'> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'neutral',
  CHECKED_IN: 'blue',
  COMPLETED: 'blue',
  NO_SHOW: 'red',
};

const CHECK_IN_LABELS: Record<CheckInStatus, string> = {
  PENDING: 'Pending',
  CHECKED_IN: 'Checked In',
  NO_SHOW: 'No Show',
};

const CHECK_IN_CHIP: Record<CheckInStatus, 'neutral' | 'green' | 'red'> = {
  PENDING: 'neutral',
  CHECKED_IN: 'green',
  NO_SHOW: 'red',
};

type StatusTrack = [string, string, string];

const STATUS_TRACK: Record<BookingStatus, StatusTrack> = {
  PENDING: ['var(--yellow-400)', 'var(--border)', 'var(--border)'],
  APPROVED: ['var(--green-400)', 'var(--green-400)', 'var(--border)'],
  REJECTED: ['var(--red-400)', 'var(--border)', 'var(--border)'],
  CANCELLED: ['var(--neutral-300)', 'var(--neutral-300)', 'var(--border)'],
  CHECKED_IN: ['var(--blue-400)', 'var(--blue-400)', 'var(--blue-400)'],
  COMPLETED: ['var(--blue-500)', 'var(--blue-500)', 'var(--blue-500)'],
  NO_SHOW: ['var(--red-500)', 'var(--red-500)', 'var(--border)'],
};

function formatDateTime(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatRequester(booking: BookingResponse) {
  return booking.requesterRegistrationNumber ?? booking.requesterId.slice(0, 8);
}

function summarizeLocation(resource?: ResourceResponse | null) {
  if (!resource) {
    return 'Location unavailable';
  }

  const locationName = resource.locationDetails?.locationName ?? resource.location ?? 'Location unavailable';
  const buildingName = resource.locationDetails?.buildingName;

  return buildingName ? `${locationName} · ${buildingName}` : locationName;
}

function statusNote(booking: BookingResponse) {
  if (booking.rejectionReason) {
    return booking.rejectionReason;
  }

  if (booking.cancellationReason) {
    return booking.cancellationReason;
  }

  if (booking.purpose?.trim()) {
    return booking.purpose;
  }

  return 'No purpose provided for this booking.';
}

function isSpaceResource(resource?: ResourceResponse | null) {
  return resource?.category === 'SPACES';
}

export function BookingCardSkeleton() {
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
      <Skeleton variant="rect" height={3} style={{ borderRadius: 0 }} />
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Skeleton width={92} height={18} style={{ borderRadius: 'var(--radius-sm)' }} />
          <Skeleton width={76} height={18} style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
        <Skeleton width="72%" height={14} />
        <Skeleton width="100%" height={10} />
        <Skeleton width="60%" height={10} />
      </div>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', gap: 3 }}>
          <Skeleton variant="rect" height={3} style={{ flex: 1, borderRadius: 2 }} />
          <Skeleton variant="rect" height={3} style={{ flex: 1, borderRadius: 2 }} />
          <Skeleton variant="rect" height={3} style={{ flex: 1, borderRadius: 2 }} />
        </div>
        <Skeleton width={54} height={8} />
      </div>
      <div style={{ padding: '12px 16px 14px', display: 'grid', gap: 10 }}>
        <Skeleton width="100%" height={10} />
        <Skeleton width="82%" height={10} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Skeleton width={96} height={24} style={{ borderRadius: 'var(--radius-sm)' }} />
          <Skeleton width={72} height={24} style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
    </div>
  );
}

export function BookingCard({
  booking,
  resource,
  showRequester = false,
  actions,
  onLocation,
}: BookingCardProps) {
  const locationLabel = summarizeLocation(resource);
  const note = statusNote(booking);
  const showCheckInStatus = isSpaceResource(resource) && booking.checkInStatus;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--card-shadow)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 3, background: STATUS_STRIPE[booking.status] }} />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '.04em',
              }}
            >
              {booking.resource.code}
            </span>
            {resource?.category && (
              <Chip size="sm" color="neutral">
                {getResourceCategoryLabel(resource.category)}
              </Chip>
            )}
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
            {booking.resource.name}
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
              minHeight: 34,
            }}
          >
            {note}
          </p>
        </div>
        <Chip color={STATUS_CHIP[booking.status]} size="sm" dot style={{ flexShrink: 0, marginTop: 1 }}>
          {STATUS_LABELS[booking.status]}
        </Chip>
      </div>

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
          {STATUS_TRACK[booking.status].map((color, index) => (
            <div
              key={index}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                background: color,
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
            color: STATUS_STRIPE[booking.status],
            flexShrink: 0,
          }}
        >
          {STATUS_LABELS[booking.status]}
        </span>
      </div>

      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-body)', fontSize: 11.5 }}>
            <CalendarClock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span>{formatDateTime(booking.startTime)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-body)', fontSize: 11.5 }}>
            <Clock3 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span>{formatDateTime(booking.endTime)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-body)', fontSize: 11.5 }}>
            <MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {locationLabel}
            </span>
          </div>
          {showRequester && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-body)', fontSize: 11.5 }}>
              <UserRound size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span>{formatRequester(booking)}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          {showCheckInStatus ? (
            <Chip color={CHECK_IN_CHIP[showCheckInStatus]} size="sm">
              {CHECK_IN_LABELS[showCheckInStatus]}
            </Chip>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {onLocation && (
              <Button
                variant="ghost-accent"
                size="xs"
                iconLeft={<MapPin size={12} />}
                onClick={onLocation}
              >
                Location
              </Button>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingSection({ label, color, count, children }: BookingSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        {typeof count === 'number' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', opacity: 0.55 }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            gap: 16,
            width: '100%',
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '18px 0 18px',
            scrollPaddingInline: 0,
            scrollbarWidth: 'thin',
            overscrollBehaviorX: 'contain',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
