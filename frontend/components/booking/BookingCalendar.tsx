'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { BookingResponse } from '@/lib/api-types';

interface BookingCalendarProps {
  bookings: BookingResponse[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  resourceId?: string;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getBookingStatusForDay(bookings: BookingResponse[], date: Date): BookingResponse[] {
  return bookings.filter((booking) => {
    const bookingDate = new Date(booking.startTime);
    return isSameDay(bookingDate, date);
  });
}

function getStatusColor(booking: BookingResponse): string {
  switch (booking.status) {
    case 'APPROVED':
      return '#10b981'; // green
    case 'PENDING':
      return '#eab308'; // yellow
    case 'REJECTED':
    case 'CANCELLED':
      return '#6b7280'; // gray
    case 'CHECKED_IN':
    case 'COMPLETED':
      return '#0ea5e9'; // blue
    case 'NO_SHOW':
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}

export function BookingCalendar({
  bookings,
  selectedDate = new Date(),
  onDateSelect,
  resourceId,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const filteredBookings = resourceId
    ? bookings.filter((b) => b.resource.id === resourceId)
    : bookings;

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthName = currentMonth.toLocaleString('en-LK', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={handlePrevMonth} style={{ padding: 6 }}>
            <ChevronLeft size={18} />
          </Button>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{monthName}</h3>
          <Button variant="ghost" onClick={handleNextMonth} style={{ padding: 6 }}>
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
          }}
        >
          {/* Week Day Headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--text-muted)',
                padding: '8px 4px',
              }}
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayBookings = getBookingStatusForDay(filteredBookings, date);
            const isSelected = selectedDate && isSameDay(selectedDate, date);
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={day}
                onClick={() => onDateSelect?.(date)}
                style={{
                  padding: 8,
                  border: isSelected ? '2px solid var(--primary)' : isToday ? '2px solid var(--text-muted)' : '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: onDateSelect ? 'pointer' : 'default',
                  backgroundColor: isSelected ? 'var(--bg-primary)' : isToday ? 'var(--bg-secondary)' : 'transparent',
                  minHeight: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500 }}>{day}</div>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                  {dayBookings.slice(0, 2).map((booking, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(booking),
                        cursor: 'pointer',
                      }}
                      title={`${booking.status} - ${new Date(booking.startTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}`}
                    />
                  ))}
                  {dayBookings.length > 2 && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{dayBookings.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
            Approved
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#eab308' }} />
            Pending
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0ea5e9' }} />
            Checked In
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            No Show
          </div>
        </div>
      </div>
    </Card>
  );
}
