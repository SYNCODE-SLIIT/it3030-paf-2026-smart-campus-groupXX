'use client';

import React from 'react';
import { ArrowRight, CalendarClock, Clock3, FileText, Sparkles } from 'lucide-react';

import { Alert, Button, Card, Chip, Dialog, Input, Textarea } from '@/components/ui';
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

  const requestedStartPreview = formData.requestedStartTime
    ? formatDateTime(new Date(formData.requestedStartTime).toISOString())
    : 'Not set';
  const requestedEndPreview = formData.requestedEndTime
    ? formatDateTime(new Date(formData.requestedEndTime).toISOString())
    : 'Not set';
  const hasScheduleChanges = formData.requestedStartTime !== toLocalDateTimeInput(booking.startTime)
    || formData.requestedEndTime !== toLocalDateTimeInput(booking.endTime);

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Request Booking Modification" size="md">
      <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'grid', gap: 18 }}>
        <Card
          style={{
            padding: 18,
            display: 'grid',
            gap: 14,
            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
            background: 'color-mix(in srgb, var(--bg-card) 94%, #eef4ff 6%)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
                {booking.resource.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{booking.resource.code}</div>
            </div>
            <Chip color={hasScheduleChanges ? 'blue' : 'neutral'} size="sm" dot>
              {hasScheduleChanges ? 'Pending Changes' : 'Current Schedule'}
            </Chip>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'grid',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-muted)' }}>
                Current Window
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-body)' }}>
                <CalendarClock size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{formatDateTime(booking.startTime)}</span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{formatDateTime(booking.endTime)}</span>
              </div>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in srgb, var(--blue-300) 50%, var(--border))',
                background: 'color-mix(in srgb, var(--blue-50) 65%, var(--surface))',
                display: 'grid',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-muted)' }}>
                Requested Window
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-body)' }}>
                <Sparkles size={14} style={{ color: 'var(--blue-500)' }} />
                <span>{requestedStartPreview}</span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{requestedEndPreview}</span>
              </div>
            </div>
          </div>
        </Card>

        <Alert variant="info" title="Reschedule request">
          Managers will review the requested time window before the booking is changed.
        </Alert>

        <Card
          style={{
            padding: 18,
            display: 'grid',
            gap: 14,
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
              Request New Schedule
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Pick the updated booking window and optionally explain why the booking needs to be moved.
            </div>
          </div>

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
              placeholder="Explain why this booking should be rescheduled."
              rows={4}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              <FileText size={13} />
              <span>Adding context can help managers review the request faster.</span>
            </div>
          </div>
        </Card>

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
