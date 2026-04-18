'use client';

import React from 'react';

import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import type { CreateResourceRequest, ResourceResponse, UpdateResourceRequest } from '@/lib/api-types';
import { resourceCategoryOptions, resourceStatusOptions } from '@/lib/resource-display';

type ResourceFormValues = {
  code: string;
  name: string;
  category: CreateResourceRequest['category'];
  subcategory: string;
  description: string;
  location: string;
  capacity: string;
  quantity: string;
  status: CreateResourceRequest['status'];
  bookable: boolean;
  movable: boolean;
  availableFrom: string;
  availableTo: string;
};

type ResourceFormErrors = Partial<Record<keyof ResourceFormValues, string>>;

const defaultValues: ResourceFormValues = {
  code: '',
  name: '',
  category: 'SPACES',
  subcategory: '',
  description: '',
  location: '',
  capacity: '',
  quantity: '',
  status: 'ACTIVE',
  bookable: true,
  movable: false,
  availableFrom: '',
  availableTo: '',
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesFromResource(resource: ResourceResponse | null): ResourceFormValues {
  if (!resource) {
    return defaultValues;
  }

  return {
    code: resource.code,
    name: resource.name,
    category: resource.category,
    subcategory: resource.subcategory ?? '',
    description: resource.description ?? '',
    location: resource.location ?? '',
    capacity: resource.capacity === null ? '' : String(resource.capacity),
    quantity: resource.quantity === null ? '' : String(resource.quantity),
    status: resource.status,
    bookable: resource.bookable,
    movable: resource.movable,
    availableFrom: resource.availableFrom ?? '',
    availableTo: resource.availableTo ?? '',
  };
}

export function ResourceFormModal({
  title,
  resource,
  submitting,
  onSubmit,
  onCancel,
}: {
  title: string;
  resource: ResourceResponse | null;
  submitting: boolean;
  onSubmit: (payload: CreateResourceRequest | UpdateResourceRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<ResourceFormValues>(() => valuesFromResource(resource));
  const [errors, setErrors] = React.useState<ResourceFormErrors>({});

  React.useEffect(() => {
    setValues(valuesFromResource(resource));
    setErrors({});
  }, [resource]);

  function validate(next: ResourceFormValues) {
    const nextErrors: ResourceFormErrors = {};
    if (!next.code.trim()) nextErrors.code = 'Code is required.';
    if (!next.name.trim()) nextErrors.name = 'Name is required.';
    if (next.availableFrom && next.availableTo && next.availableFrom >= next.availableTo) {
      nextErrors.availableTo = 'Available to must be later than available from.';
    }
    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateResourceRequest | UpdateResourceRequest = {
      code: values.code.trim(),
      name: values.name.trim(),
      category: values.category,
      subcategory: values.subcategory.trim() || null,
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      capacity: parseOptionalNumber(values.capacity),
      quantity: parseOptionalNumber(values.quantity),
      status: values.status,
      bookable: values.bookable,
      movable: values.movable,
      availableFrom: values.availableFrom || null,
      availableTo: values.availableTo || null,
    };

    await onSubmit(payload);
  }

  return (
    <Card>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{title}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Manage the resource catalogue entry.</p>
          </div>
          <Button type="button" variant="subtle" size="sm" onClick={onCancel}>Close</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input label="Code" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))} error={errors.code} required />
          <Input label="Name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} error={errors.name} required />
          <Select label="Category" value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value as ResourceFormValues['category'] }))} options={resourceCategoryOptions} />
          <Select label="Status" value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ResourceFormValues['status'] }))} options={resourceStatusOptions} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <Input label="Subcategory" value={values.subcategory} onChange={(event) => setValues((current) => ({ ...current, subcategory: event.target.value }))} />
          <Input label="Location" value={values.location} onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))} />
          <Input label="Capacity" type="number" min={0} value={values.capacity} onChange={(event) => setValues((current) => ({ ...current, capacity: event.target.value }))} />
          <Input label="Quantity" type="number" min={0} value={values.quantity} onChange={(event) => setValues((current) => ({ ...current, quantity: event.target.value }))} />
        </div>

        <Textarea label="Description" value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} rows={4} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <Input label="Available From" type="time" value={values.availableFrom} onChange={(event) => setValues((current) => ({ ...current, availableFrom: event.target.value }))} error={errors.availableFrom} />
          <Input label="Available To" type="time" value={values.availableTo} onChange={(event) => setValues((current) => ({ ...current, availableTo: event.target.value }))} error={errors.availableTo} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24, color: 'var(--text-body)' }}>
            <input type="checkbox" checked={values.bookable} onChange={(event) => setValues((current) => ({ ...current, bookable: event.target.checked }))} />
            Bookable
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24, color: 'var(--text-body)' }}>
            <input type="checkbox" checked={values.movable} onChange={(event) => setValues((current) => ({ ...current, movable: event.target.checked }))} />
            Movable
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="subtle" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="glass" loading={submitting}>{resource ? 'Update Resource' : 'Create Resource'}</Button>
        </div>
      </form>
    </Card>
  );
}