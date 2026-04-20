'use client';

import React from 'react';
import { Calendar, Clock, RotateCw } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import type { CreateRecurringBookingRequest, RecurrencePattern, ResourceResponse } from '@/lib/api-types';

interface RecurringBookingFormProps {
  resources: ResourceResponse[];
  onSubmit: (data: CreateRecurringBookingRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RecurringBookingForm({ resources, onSubmit, onCancel, isLoading }: RecurringBookingFormProps) {
  const [formData, setFormData] = React.useState({
    resourceId: '',
    recurrencePattern: 'WEEKLY' as RecurrencePattern,
    startDate: '',
    endDate: '',
    occurrenceCount: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const recurrencePatterns: { value: RecurrencePattern; label: string }[] = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BIWEEKLY', label: 'Biweekly' },
    { value: 'MONTHLY', label: 'Monthly' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.resourceId) newErrors.resourceId = 'Resource is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.endDate && !formData.occurrenceCount) {
      newErrors.endDate = 'Either end date or occurrence count is required';
    }

    if (formData.occurrenceCount && parseInt(formData.occurrenceCount) < 1) {
      newErrors.occurrenceCount = 'Occurrence count must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateRecurringBookingRequest = {
      resourceId: formData.resourceId,
      recurrencePattern: formData.recurrencePattern,
      startDate: new Date(`${formData.startDate}T00:00:00Z`).toISOString(),
      endDate: formData.endDate ? new Date(`${formData.endDate}T23:59:59Z`).toISOString() : null,
      occurrenceCount: formData.occurrenceCount ? parseInt(formData.occurrenceCount) : null,
      startTime: formData.startTime,
      endTime: formData.endTime,
      purpose: formData.purpose || null,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create recurring booking' });
    }
  };

  return (
    <Card style={{ padding: 24, maxWidth: 600 }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Resource *
          </label>
          <Select
            value={formData.resourceId}
            onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
            style={{ width: '100%' }}
            options={[
              { value: '', label: 'Select a resource' },
              ...resources.map((r) => ({ value: r.id, label: `${r.code} - ${r.name}` })),
            ]}
          />
          {errors.resourceId && <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.resourceId}</p>}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Recurrence Pattern *
          </label>
          <Select
            value={formData.recurrencePattern}
            onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value as RecurrencePattern })}
            style={{ width: '100%' }}
            options={recurrencePatterns.map((pattern) => ({ value: pattern.value, label: pattern.label }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Start Date *
            </label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            {errors.startDate && <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.startDate}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              End Date (optional)
            </label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            {errors.endDate && <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.endDate}</p>}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Occurrence Count (if no end date)
          </label>
          <Input
            type="number"
            min="1"
            value={formData.occurrenceCount}
            onChange={(e) => setFormData({ ...formData, occurrenceCount: e.target.value })}
            placeholder="e.g., 10"
          />
          {errors.occurrenceCount && <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.occurrenceCount}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Start Time *
            </label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            {errors.startTime && <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.startTime}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              End Time *
            </label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
            {errors.endTime && <p style={{ color: 'var(--text-error)', fontSize: 12, marginTop: 4 }}>{errors.endTime}</p>}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Purpose (optional)
          </label>
          <Textarea
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Why are you booking this resource?"
            style={{ minHeight: 80 }}
          />
        </div>

        {errors.submit && (
          <div style={{ color: 'var(--text-error)', fontSize: 13, padding: 8, backgroundColor: 'var(--bg-error)', borderRadius: 4 }}>
            {errors.submit}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Recurring Booking'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
