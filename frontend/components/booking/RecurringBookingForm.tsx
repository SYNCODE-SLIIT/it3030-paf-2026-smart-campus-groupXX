'use client';

import React from 'react';
import { CalendarRange, RotateCw } from 'lucide-react';

import { Alert, Button, Card, Chip, Input, Select, Textarea } from '@/components/ui';
import type { CreateRecurringBookingRequest, RecurrencePattern, ResourceOption } from '@/lib/api-types';
import { getResourceCategoryLabel } from '@/lib/resource-display';

interface RecurringBookingFormProps {
  resources: ResourceOption[];
  onSubmit: (data: CreateRecurringBookingRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const DURATION_HINTS: Record<string, string> = {
  SPACES: 'Max 3 hours',
  LECTURE_HALL: 'Max 3 hours',
  LABORATORY: 'Max 3 hours',
  LIBRARY_SPACE: 'Max 3 hours',
  MEETING_ROOM: 'Max 3 hours',
  EVENT_SPACE: 'Max 3 hours',
};

function normalizeSubcategory(value: string | null) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

export function RecurringBookingForm({ resources, onSubmit, onCancel, isLoading }: RecurringBookingFormProps) {
  const [formData, setFormData] = React.useState({
    category: '',
    subcategory: '',
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

  const bookableResources = resources.filter((resource) => resource.status === 'ACTIVE' && resource.bookable);
  const categoryOptions = Array.from(new Set(bookableResources.map((resource) => resource.category)))
    .sort()
    .map((category) => ({ value: category, label: getResourceCategoryLabel(category) }));
  const categoryFilteredResources = formData.category
    ? bookableResources.filter((resource) => resource.category === formData.category)
    : [];
  const subcategoryOptions = (formData.category
    ? Array.from(
        new Set(
          categoryFilteredResources
            .map((resource) => resource.subcategory)
            .filter((subcategory): subcategory is string => Boolean(subcategory && subcategory.trim())),
        ),
      )
    : [])
    .sort((left, right) => left.localeCompare(right))
    .map((subcategory) => ({ value: subcategory, label: subcategory }));
  const filteredResources = formData.subcategory
    ? categoryFilteredResources.filter(
        (resource) => normalizeSubcategory(resource.subcategory) === normalizeSubcategory(formData.subcategory),
      )
    : categoryFilteredResources;
  const selectedSubcategoryHint = DURATION_HINTS[normalizeSubcategory(formData.subcategory)] ?? null;

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!formData.category) nextErrors.category = 'Category is required.';
    if (!formData.subcategory) nextErrors.subcategory = 'Subcategory is required.';
    if (!formData.resourceId) nextErrors.resourceId = 'Resource is required.';
    if (!formData.startDate) nextErrors.startDate = 'Start date is required.';
    if (!formData.startTime) nextErrors.startTime = 'Start time is required.';
    if (!formData.endTime) nextErrors.endTime = 'End time is required.';

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      nextErrors.endTime = 'End time must be after start time.';
    }

    if (formData.endDate && formData.startDate > formData.endDate) {
      nextErrors.endDate = 'End date must be after start date.';
    }

    if (!formData.endDate && !formData.occurrenceCount) {
      nextErrors.endDate = 'Provide an end date or an occurrence count.';
    }

    if (formData.occurrenceCount && parseInt(formData.occurrenceCount, 10) < 1) {
      nextErrors.occurrenceCount = 'Occurrence count must be at least 1.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    const payload: CreateRecurringBookingRequest = {
      resourceId: formData.resourceId,
      recurrencePattern: formData.recurrencePattern,
      startDate: new Date(`${formData.startDate}T00:00:00Z`).toISOString(),
      endDate: formData.endDate ? new Date(`${formData.endDate}T23:59:59Z`).toISOString() : null,
      occurrenceCount: formData.occurrenceCount ? parseInt(formData.occurrenceCount, 10) : null,
      startTime: formData.startTime,
      endTime: formData.endTime,
      purpose: formData.purpose.trim() || null,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create recurring booking.' });
    }
  }

  return (
    <Card style={{ padding: 22, display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
            Recurring Booking Builder
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            Configure a repeating booking pattern using the same booking catalogue.
          </div>
        </div>
        <Chip color="blue" size="sm" dot>
          Repeating
        </Chip>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <Select
              id="recurring-category"
              label="Category"
              value={formData.category}
              onChange={(event) => setFormData((current) => ({
                ...current,
                category: event.target.value,
                subcategory: '',
                resourceId: '',
              }))}
              options={[{ value: '', label: 'Select category' }, ...categoryOptions]}
            />
            {errors.category && <span style={{ fontSize: 12, color: 'var(--text-error)' }}>{errors.category}</span>}
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <Select
              id="recurring-subcategory"
              label="Subcategory"
              value={formData.subcategory}
              onChange={(event) => setFormData((current) => ({
                ...current,
                subcategory: event.target.value,
                resourceId: '',
              }))}
              options={[{ value: '', label: 'Select subcategory' }, ...subcategoryOptions]}
            />
            {selectedSubcategoryHint && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSubcategoryHint}</span>
            )}
            {errors.subcategory && <span style={{ fontSize: 12, color: 'var(--text-error)' }}>{errors.subcategory}</span>}
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <Select
              id="recurring-resource"
              label="Resource"
              value={formData.resourceId}
              onChange={(event) => setFormData((current) => ({ ...current, resourceId: event.target.value }))}
              options={[
                { value: '', label: 'Select resource' },
                ...filteredResources.map((resource) => ({ value: resource.id, label: resource.name })),
              ]}
            />
            {errors.resourceId && <span style={{ fontSize: 12, color: 'var(--text-error)' }}>{errors.resourceId}</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Select
            id="recurring-pattern"
            label="Recurrence Pattern"
            value={formData.recurrencePattern}
            onChange={(event) => setFormData((current) => ({ ...current, recurrencePattern: event.target.value as RecurrencePattern }))}
            options={recurrencePatterns}
          />
          <Input
            id="recurring-start-date"
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
          />
          <Input
            id="recurring-end-date"
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
          />
          <Input
            id="recurring-occurrence-count"
            label="Occurrence Count"
            type="number"
            min="1"
            value={formData.occurrenceCount}
            onChange={(event) => setFormData((current) => ({ ...current, occurrenceCount: event.target.value }))}
            placeholder="Optional"
          />
        </div>

        {(errors.startDate || errors.endDate || errors.occurrenceCount) && (
          <Alert variant="warning" title="Schedule details">
            {errors.startDate ?? errors.endDate ?? errors.occurrenceCount}
          </Alert>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input
            id="recurring-start-time"
            label="Start Time"
            type="time"
            value={formData.startTime}
            onChange={(event) => setFormData((current) => ({ ...current, startTime: event.target.value }))}
          />
          <Input
            id="recurring-end-time"
            label="End Time"
            type="time"
            value={formData.endTime}
            onChange={(event) => setFormData((current) => ({ ...current, endTime: event.target.value }))}
          />
        </div>

        {(errors.startTime || errors.endTime) && (
          <Alert variant="warning" title="Time details">
            {errors.startTime ?? errors.endTime}
          </Alert>
        )}

        <Textarea
          label="Purpose"
          value={formData.purpose}
          onChange={(event) => setFormData((current) => ({ ...current, purpose: event.target.value }))}
          placeholder="Why are you booking this resource on a recurring basis?"
          rows={4}
        />

        <Alert variant="info" title="Recurring rule">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CalendarRange size={14} />
            <span>
              The schedule will repeat <strong>{formData.recurrencePattern.toLowerCase()}</strong> from the start date using the selected time window.
            </span>
          </div>
        </Alert>

        {errors.submit && (
          <Alert variant="error" title="Recurring booking failed">
            {errors.submit}
          </Alert>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading} iconLeft={<RotateCw size={14} />}>
            Create Recurring Booking
          </Button>
        </div>
      </form>
    </Card>
  );
}
