'use client';

import React from 'react';
import { CheckCircle2, Clock3, UserRound, XCircle } from 'lucide-react';

import { BookingAlert as Alert } from '@/components/booking/BookingAlert';
import { Button, Card, Chip } from '@/components/ui';
import type { BookingResponse, CheckInStatus } from '@/lib/api-types';

interface BookingCheckInPanelProps {
  booking: BookingResponse;
  isManager?: boolean;
  onCheckIn?: () => Promise<void>;
  onMarkNoShow?: () => Promise<void>;
  onComplete?: () => Promise<void>;
  isLoading?: boolean;
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getCheckInStatusColor(status: CheckInStatus | null | undefined): 'yellow' | 'green' | 'red' | 'neutral' {
  switch (status) {
    case 'CHECKED_IN':
      return 'green';
    case 'NO_SHOW':
      return 'red';
    default:
      return 'neutral';
  }
}

function getCheckInStatusLabel(status: CheckInStatus | null | undefined) {
  switch (status) {
    case 'CHECKED_IN':
      return 'Checked In';
    case 'NO_SHOW':
      return 'No Show';
    default:
      return 'Pending';
  }
}

export function BookingCheckInPanel({
  booking,
  isManager,
  onCheckIn,
  onMarkNoShow,
  onComplete,
  isLoading,
}: BookingCheckInPanelProps) {
  const now = new Date();
  const bookingStart = new Date(booking.startTime);
  const bookingEnd = new Date(booking.endTime);

  const hasStarted = now >= bookingStart;
  const hasEnded = now >= bookingEnd;
  const canCheckIn = hasStarted && !hasEnded && booking.status === 'APPROVED';
  const canMarkNoShow = hasEnded && booking.status !== 'COMPLETED' && booking.checkInStatus !== 'CHECKED_IN';
  const canComplete = booking.checkInStatus === 'CHECKED_IN' && hasEnded;

  return (
    <Card style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
            {booking.resource.name}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            {booking.resource.code}
          </div>
        </div>
        <Chip color={getCheckInStatusColor(booking.checkInStatus)} size="sm" dot>
          {getCheckInStatusLabel(booking.checkInStatus)}
        </Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-muted)' }}>
            Start
          </span>
          <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{formatDateTime(booking.startTime)}</span>
        </div>
        <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-muted)' }}>
            End
          </span>
          <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{formatDateTime(booking.endTime)}</span>
        </div>
      </div>

      {booking.checkedInAt && (
        <Alert variant="success" title="Checked in">
          Booking was checked in at {formatDateTime(booking.checkedInAt)}.
        </Alert>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {hasStarted && !hasEnded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-body)' }}>
            <Clock3 size={15} style={{ color: 'var(--blue-500)' }} />
            <span>Booking is currently in progress.</span>
          </div>
        )}
        {hasEnded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-body)' }}>
            <Clock3 size={15} style={{ color: 'var(--text-muted)' }} />
            <span>Booking time has ended.</span>
          </div>
        )}
        {!hasStarted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-body)' }}>
            <UserRound size={15} style={{ color: 'var(--text-muted)' }} />
            <span>Booking starts later. Check-in opens at the start time.</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {canCheckIn && onCheckIn && (
          <Alert variant="info" title="Check-in available">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}>Check in now to mark attendance for this booking.</span>
              <Button variant="primary" onClick={onCheckIn} loading={isLoading} iconLeft={<CheckCircle2 size={14} />}>
                Check In
              </Button>
            </div>
          </Alert>
        )}

        {!isManager && booking.status === 'APPROVED' && !canCheckIn && !hasEnded && (
          <Alert variant="info" title="Awaiting booking time">
            Check-in will be available when the booking window starts.
          </Alert>
        )}

        {isManager && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canMarkNoShow && onMarkNoShow && (
              <Button variant="ghost-danger" onClick={onMarkNoShow} loading={isLoading} iconLeft={<XCircle size={14} />}>
                Mark No-Show
              </Button>
            )}
            {canComplete && onComplete && (
              <Button variant="primary" onClick={onComplete} loading={isLoading} iconLeft={<CheckCircle2 size={14} />}>
                Complete Booking
              </Button>
            )}
          </div>
        )}

        {booking.status === 'COMPLETED' && (
          <Alert variant="success" title="Booking completed">
            This booking has already been marked as completed.
          </Alert>
        )}

        {booking.status === 'NO_SHOW' && (
          <Alert variant="error" title="No show">
            This booking was recorded as a no-show.
          </Alert>
        )}
      </div>
    </Card>
  );
}
