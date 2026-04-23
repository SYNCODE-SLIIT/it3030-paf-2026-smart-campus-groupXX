'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';

import { Alert, Button, Card, Chip } from '@/components/ui';
import type { BookingResponse } from '@/lib/api-types';

interface BookingCalendarProps {
  bookings: BookingResponse[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  resourceId?: string;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate()
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getStatusColor(status: BookingResponse['status']) {
  switch (status) {
    case 'APPROVED':
      return 'green' as const;
    case 'PENDING':
      return 'yellow' as const;
    case 'CHECKED_IN':
    case 'COMPLETED':
      return 'blue' as const;
    case 'REJECTED':
    case 'NO_SHOW':
      return 'red' as const;
    case 'CANCELLED':
    default:
      return 'neutral' as const;
  }
}

function dayBookingsFor(bookings: BookingResponse[], date: Date) {
  return bookings.filter((booking) => isSameDay(new Date(booking.startTime), date));
}

export function BookingCalendar({
  bookings,
  selectedDate,
  onDateSelect,
  resourceId,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const baseDate = selectedDate ?? new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });
  const [internalSelectedDate, setInternalSelectedDate] = React.useState<Date>(selectedDate ?? new Date());

  React.useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setInternalSelectedDate(selectedDate);
    setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const activeDate = selectedDate ?? internalSelectedDate;
  const filteredBookings = React.useMemo(
    () => resourceId ? bookings.filter((booking) => booking.resource.id === resourceId) : bookings,
    [bookings, resourceId],
  );

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const activeDayBookings = dayBookingsFor(filteredBookings, activeDate);
  const monthLabel = currentMonth.toLocaleString('en-LK', { month: 'long', year: 'numeric' });

  function handleDateSelect(date: Date) {
    setInternalSelectedDate(date);
    onDateSelect?.(date);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.9fr)', gap: 16 }}>
      <Card style={{ padding: 20, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
              Booking Calendar
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Track booking density and drill into a selected day.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="ghost" size="xs" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
              <ChevronLeft size={16} />
            </Button>
            <Chip color="neutral" size="sm">
              {monthLabel}
            </Chip>
            <Button variant="ghost" size="xs" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '8px 4px',
              }}
            >
              {day}
            </div>
          ))}

          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {days.map((day) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayBookings = dayBookingsFor(filteredBookings, date);
            const isSelected = isSameDay(activeDate, date);
            const isToday = isSameDay(date, new Date());

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateSelect(date)}
                style={{
                  minHeight: 86,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: 10,
                  borderRadius: 12,
                  border: isSelected
                    ? '1px solid rgba(59,130,246,0.45)'
                    : isToday
                      ? '1px solid rgba(238,202,68,0.5)'
                      : '1px solid var(--border)',
                  background: isSelected
                    ? 'rgba(59,130,246,0.08)'
                    : isToday
                      ? 'rgba(238,202,68,0.08)'
                      : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-h)',
                  }}
                >
                  {day}
                </div>

                <div style={{ display: 'grid', gap: 6, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {dayBookings.slice(0, 3).map((booking) => (
                      <span
                        key={booking.id}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background:
                            getStatusColor(booking.status) === 'green' ? 'var(--green-400)'
                              : getStatusColor(booking.status) === 'yellow' ? 'var(--yellow-400)'
                                : getStatusColor(booking.status) === 'blue' ? 'var(--blue-400)'
                                  : getStatusColor(booking.status) === 'red' ? 'var(--red-400)'
                                    : 'var(--neutral-400)',
                        }}
                        title={`${booking.resource.name} · ${booking.status}`}
                      />
                    ))}
                    {dayBookings.length > 3 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{dayBookings.length - 3}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {dayBookings.length === 0 ? 'No bookings' : `${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card style={{ padding: 20, display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
            {formatDate(activeDate)}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            Bookings scheduled for the selected day.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip color="green" size="sm">Approved</Chip>
          <Chip color="yellow" size="sm">Pending</Chip>
          <Chip color="blue" size="sm">Checked In</Chip>
          <Chip color="red" size="sm">Rejected / No Show</Chip>
        </div>

        {activeDayBookings.length === 0 ? (
          <Alert variant="info" title="Nothing scheduled">
            No bookings are scheduled for this day.
          </Alert>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {activeDayBookings
              .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
              .map((booking) => (
                <div
                  key={booking.id}
                  style={{
                    display: 'grid',
                    gap: 8,
                    padding: 14,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>{booking.resource.name}</div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>{booking.resource.code}</div>
                    </div>
                    <Chip color={getStatusColor(booking.status)} size="sm" dot>
                      {booking.status}
                    </Chip>
                  </div>

                  <div style={{ display: 'grid', gap: 6, fontSize: 11.5, color: 'var(--text-body)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock3 size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>{formatTime(booking.startTime)} to {formatTime(booking.endTime)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>{booking.purpose ?? 'No purpose provided'}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
