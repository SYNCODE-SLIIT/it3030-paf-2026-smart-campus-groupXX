'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, User } from 'lucide-react';
import { Alert, Button, Card, Chip } from '@/components/ui';
import type { BookingResponse, CheckInStatus } from '@/lib/api-types';

interface BookingCheckInPanelProps {
  booking: BookingResponse;
  isManager?: boolean;
  onCheckIn?: () => Promise<void>;
  onMarkNoShow?: () => Promise<void>;
  onComplete?: () => Promise<void>;
  isLoading?: boolean;
}

function formatDateTime(dateString: string): string {
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

function getCheckInStatusLabel(status: CheckInStatus | null | undefined): string {
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
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Booking Details */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Check-in Status</h3>
            <Chip color={getCheckInStatusColor(booking.checkInStatus)}>
              {getCheckInStatusLabel(booking.checkInStatus)}
            </Chip>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>
                Start
              </div>
              <div>{formatDateTime(booking.startTime)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>
                End
              </div>
              <div>{formatDateTime(booking.endTime)}</div>
            </div>
          </div>
        </div>

        {/* Check-in Info */}
        {booking.checkedInAt && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              backgroundColor: 'var(--bg-success)',
              borderRadius: 6,
              alignItems: 'flex-start',
            }}
          >
            <CheckCircle2 size={18} style={{ color: 'var(--text-success)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12 }}>
              <strong style={{ color: 'var(--text-success)' }}>Checked in</strong>
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(booking.checkedInAt)}</span>
            </div>
          </div>
        )}

        {/* Time Status */}
        <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          {hasStarted && !hasEnded && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-info)' }}>
              <Clock size={16} />
              <span>Booking is currently ongoing</span>
            </div>
          )}
          {hasEnded && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)' }}>
              <Clock size={16} />
              <span>Booking time has ended</span>
            </div>
          )}
          {!hasStarted && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)' }}>
              <Clock size={16} />
              <span>Booking starts in {Math.round((bookingStart.getTime() - now.getTime()) / 60000)} minutes</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gap: 8 }}>
          {/* User Check-in */}
          {canCheckIn && onCheckIn && (
            <Alert variant="info" title="Check-in Available">
              <div style={{ display: 'grid', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13 }}>Click below to mark yourself as checked in.</p>
                <Button
                  variant="primary"
                  onClick={onCheckIn}
                  disabled={isLoading}
                  style={{ justifySelf: 'flex-start' }}
                >
                  {isLoading ? 'Checking in...' : 'Check In Now'}
                </Button>
              </div>
            </Alert>
          )}

          {/* Manager Actions */}
          {isManager && (
            <div style={{ display: 'grid', gap: 8 }}>
              {canMarkNoShow && onMarkNoShow && (
                <Button variant="ghost-danger" onClick={onMarkNoShow} disabled={isLoading} style={{ justifyContent: 'flex-start' }}>
                  {isLoading ? 'Processing...' : '❌ Mark as No Show'}
                </Button>
              )}

              {canComplete && onComplete && (
                <Button variant="primary" onClick={onComplete} disabled={isLoading} style={{ justifyContent: 'flex-start' }}>
                  {isLoading ? 'Completing...' : '✓ Complete Booking'}
                </Button>
              )}

              {booking.status === 'COMPLETED' && (
                <Alert variant="success" title="Booking Completed">
                  <p style={{ margin: 0, fontSize: 13 }}>This booking has been marked as completed.</p>
                </Alert>
              )}

              {booking.status === 'NO_SHOW' && (
                <Alert variant="error" title="No Show">
                  <p style={{ margin: 0, fontSize: 13 }}>User did not check in or use this booking.</p>
                </Alert>
              )}
            </div>
          )}

          {/* User Waiting for Status */}
          {!isManager && booking.status === 'APPROVED' && !canCheckIn && !hasEnded && (
            <Alert variant="info" title="Awaiting Booking Time">
              <p style={{ margin: 0, fontSize: 13 }}>
                Check-in will be available when the booking time starts ({formatDateTime(booking.startTime)}).
              </p>
            </Alert>
          )}
        </div>
      </div>
    </Card>
  );
}
