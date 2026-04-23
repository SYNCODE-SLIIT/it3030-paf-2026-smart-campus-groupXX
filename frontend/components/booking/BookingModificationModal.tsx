'use client';

import React from 'react';
import { ArrowRight, Clock3, CalendarClock } from 'lucide-react';

import { Alert, Button, Dialog, Input, Textarea } from '@/components/ui';
import type { BookingResponse, RequestModificationRequest } from '@/lib/api-types';

interface BookingModificationModalProps {
  booking: BookingResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequestModificationRequest) => Promise<void>;
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

function toLocalDateTimeInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function BookingModificationModal({
  booking,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: BookingModificationModalProps) {
  const [formData, setFormData] = React.useState({
    requestedStartTime: '',
    requestedEndTime: '',
    reason: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!booking || !isOpen) {
      return;
    }

    setFormData({
      requestedStartTime: toLocalDateTimeInput(booking.startTime),
      requestedEndTime: toLocalDateTimeInput(booking.endTime),
      reason: '',
    });
    setErrors({});
  }, [booking, isOpen]);

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!formData.requestedStartTime) {
      nextErrors.requestedStartTime = 'New start time is required.';
    }

    if (!formData.requestedEndTime) {
      nextErrors.requestedEndTime = 'New end time is required.';
    }

    if (formData.requestedStartTime && formData.requestedEndTime) {
      const start = new Date(formData.requestedStartTime);
      const end = new Date(formData.requestedEndTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        nextErrors.requestedEndTime = 'Enter valid date and time values.';
      } else if (start.getTime() >= end.getTime()) {
        nextErrors.requestedEndTime = 'End time must be after start time.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!booking || !validateForm()) {
      return;
    }

    try {
      const payload: RequestModificationRequest = {
        requestedStartTime: new Date(formData.requestedStartTime).toISOString(),
        requestedEndTime: new Date(formData.requestedEndTime).toISOString(),
        reason: formData.reason.trim() || undefined,
      };

      await onSubmit(payload);
      handleClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to request modification.' });
    }
  }

  function handleClose() {
    setFormData({ requestedStartTime: '', requestedEndTime: '', reason: '' });
    setErrors({});
    onClose();
  }

  if (!booking) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Request Booking Modification" size="md">
      <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gap: 10,
            padding: 16,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
            {booking.resource.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{booking.resource.code}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-body)' }}>
            <CalendarClock size={14} style={{ color: 'var(--text-muted)' }} />
            <span>{formatDateTime(booking.startTime)}</span>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
            <span>{formatDateTime(booking.endTime)}</span>
          </div>
        </div>

        <Alert variant="info" title="Reschedule request">
          Managers will review the new time window before it is applied.
        </Alert>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <Input
              id="booking-modification-start"
              label="New Start Time"
              type="datetime-local"
              value={formData.requestedStartTime}
              onChange={(event) => setFormData((current) => ({ ...current, requestedStartTime: event.target.value }))}
            />
            {errors.requestedStartTime && (
              <span style={{ fontSize: 12, color: 'var(--text-error)' }}>{errors.requestedStartTime}</span>
            )}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Input
              id="booking-modification-end"
              label="New End Time"
              type="datetime-local"
              value={formData.requestedEndTime}
              onChange={(event) => setFormData((current) => ({ ...current, requestedEndTime: event.target.value }))}
            />
            {errors.requestedEndTime && (
              <span style={{ fontSize: 12, color: 'var(--text-error)' }}>{errors.requestedEndTime}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <Textarea
            label="Reason"
            value={formData.reason}
            onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Why should this booking be rescheduled?"
            rows={4}
          />
        </div>

        {errors.submit && (
          <Alert variant="error" title="Request failed">
            {errors.submit}
          </Alert>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={isLoading}>
            Close
          </Button>
          <Button variant="primary" type="submit" loading={isLoading} iconLeft={<Clock3 size={14} />}>
            Request Modification
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
