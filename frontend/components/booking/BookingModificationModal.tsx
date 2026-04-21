'use client';

import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Button, Dialog, Input, Textarea } from '@/components/ui';
import type { BookingResponse, RequestModificationRequest } from '@/lib/api-types';

interface BookingModificationModalProps {
  booking: BookingResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequestModificationRequest) => Promise<void>;
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
    if (booking && isOpen) {
      setFormData({
        requestedStartTime: booking.startTime.split('T')[1]?.substring(0, 5) || '',
        requestedEndTime: booking.endTime.split('T')[1]?.substring(0, 5) || '',
        reason: '',
      });
      setErrors({});
    }
  }, [booking, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.requestedStartTime) newErrors.requestedStartTime = 'New start time is required';
    if (!formData.requestedEndTime) newErrors.requestedEndTime = 'New end time is required';

    if (formData.requestedStartTime && formData.requestedEndTime) {
      if (formData.requestedStartTime >= formData.requestedEndTime) {
        newErrors.requestedEndTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !booking) return;

    try {
      const baseDate = new Date(booking.startTime).toISOString().split('T')[0];
      const payload: RequestModificationRequest = {
        requestedStartTime: `${baseDate}T${formData.requestedStartTime}:00Z`,
        requestedEndTime: `${baseDate}T${formData.requestedEndTime}:00Z`,
        reason: formData.reason || undefined,
      };

      await onSubmit(payload);
      handleClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to request modification' });
    }
  };

  const handleClose = () => {
    setFormData({ requestedStartTime: '', requestedEndTime: '', reason: '' });
    setErrors({});
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Request Time Modification">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, padding: '20px 0' }}>
        <div style={{ backgroundColor: 'var(--bg-info)', padding: 12, borderRadius: 6, display: 'flex', gap: 12 }}>
          <AlertCircle size={20} style={{ flexShrink: 0, color: 'var(--text-info)' }} />
          <div style={{ fontSize: 13, color: 'var(--text-info)', lineHeight: 1.5 }}>
            <strong>Current Booking:</strong>
            <br />
            {formatDateTime(booking.startTime)} → {formatDateTime(booking.endTime)}
            <br />
            <strong>{booking.resource.name}</strong>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            New Start Time *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: 'var(--text-muted)' }} />
            <Input
              type="time"
              value={formData.requestedStartTime}
              onChange={(e) => setFormData({ ...formData, requestedStartTime: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
          {errors.requestedStartTime && (
            <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.requestedStartTime}</p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            New End Time *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: 'var(--text-muted)' }} />
            <Input
              type="time"
              value={formData.requestedEndTime}
              onChange={(e) => setFormData({ ...formData, requestedEndTime: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
          {errors.requestedEndTime && (
            <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.requestedEndTime}</p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Reason (optional)
          </label>
          <Textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Why do you need to change the time?"
            style={{ minHeight: 80 }}
          />
        </div>

        {errors.submit && (
          <div style={{ color: 'var(--text-error)', fontSize: 13, padding: 8, backgroundColor: 'var(--bg-error)', borderRadius: 4 }}>
            {errors.submit}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Request Modification'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
