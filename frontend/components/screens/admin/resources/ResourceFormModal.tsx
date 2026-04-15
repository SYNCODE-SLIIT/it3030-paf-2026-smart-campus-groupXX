'use client';

import React from 'react';
import { LayoutGrid, X } from 'lucide-react';

import { Alert, Button, Card, Input, Select, Textarea, Toggle } from '@/components/ui';
import type { CreateResourceRequest, ResourceCategory, ResourceResponse, ResourceStatus } from '@/lib/api-types';
import { resourceCategoryOptions, resourceStatusOptions } from '@/lib/resource-display';

interface ResourceFormValues {
  code: string;
  name: string;
  category: ResourceCategory;
  subcategory: string;
  location: string;
  capacity: string;
  quantity: string;
  status: ResourceStatus;
  bookable: boolean;
  movable: boolean;
  availableFrom: string;
  availableTo: string;
}

type ResourceFormErrors = Partial<Record<keyof ResourceFormValues, string>>;

const defaultValues: ResourceFormValues = {
  code: '',
  name: '',
  category: 'SPACE',
  subcategory: '',
  location: '',
  capacity: '',
  quantity: '',
  status: 'ACTIVE',
  bookable: true,
  movable: false,
  availableFrom: '',
  availableTo: '',
};

function toFormValues(resource: ResourceResponse | null | undefined): ResourceFormValues {
  if (!resource) {
    return defaultValues;
  }

  return {
    code: resource.code,
    name: resource.name,
    category: resource.category,
    subcategory: resource.subcategory ?? '',
    location: resource.location ?? '',
    capacity: resource.capacity?.toString() ?? '',
    quantity: resource.quantity?.toString() ?? '',
    status: resource.status,
    bookable: resource.bookable,
    movable: resource.movable,
    availableFrom: resource.availableFrom ?? '',
    availableTo: resource.availableTo ?? '',
  };
}

function parseNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function ResourceFormModal({
  open,
  resource,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  resource?: ResourceResponse | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateResourceRequest) => Promise<void>;
}) {
  const [values, setValues] = React.useState<ResourceFormValues>(defaultValues);
  const [errors, setErrors] = React.useState<ResourceFormErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const heading = resource ? 'Edit Resource' : 'Add Resource';

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setValues(toFormValues(resource));
    setErrors({});
    setFormError(null);
  }, [open, resource]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ResourceFormErrors = {};

    if (!values.code.trim()) {
      nextErrors.code = 'Code is required.';
    }
    if (!values.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    const capacity = parseNumber(values.capacity);
    const quantity = parseNumber(values.quantity);

    if (Number.isNaN(capacity)) {
      nextErrors.capacity = 'Capacity must be a valid number.';
    } else if (capacity !== null && capacity < 0) {
      nextErrors.capacity = 'Capacity cannot be negative.';
    }

    if (Number.isNaN(quantity)) {
      nextErrors.quantity = 'Quantity must be a valid number.';
    } else if (quantity !== null && quantity < 0) {
      nextErrors.quantity = 'Quantity cannot be negative.';
    }

    if ((values.availableFrom && !values.availableTo) || (!values.availableFrom && values.availableTo)) {
      nextErrors.availableFrom = 'Set both availability times.';
      nextErrors.availableTo = 'Set both availability times.';
    } else if (values.availableFrom && values.availableTo && values.availableFrom >= values.availableTo) {
      nextErrors.availableFrom = 'Start time must be earlier than end time.';
      nextErrors.availableTo = 'End time must be later than start time.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }

    setFormError(null);

    try {
      await onSubmit({
        code: values.code.trim(),
        name: values.name.trim(),
        category: values.category,
        subcategory: values.subcategory.trim() || null,
        location: values.location.trim() || null,
        capacity,
        quantity,
        status: values.status,
        bookable: values.bookable,
        movable: values.movable,
        availableFrom: values.availableFrom || null,
        availableTo: values.availableTo || null,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not save this resource right now.');
    }
  }

  return (
    <>
      <style>{`
        .resource-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 70;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(20, 18, 12, 0.44);
          backdrop-filter: blur(10px);
        }

        .resource-modal-shell {
          width: min(100%, 820px);
          max-height: calc(100vh - 48px);
          overflow-y: auto;
        }

        .resource-modal-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--text-body);
          cursor: pointer;
          transition: background .15s ease, transform .15s ease;
        }

        .resource-modal-close:hover {
          background: rgba(238,202,68,.12);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="resource-modal-overlay" onClick={onClose}>
        <div className="resource-modal-shell" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title" onClick={(event) => event.stopPropagation()}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ display: 'flex', color: 'var(--yellow-500)' }}>
                    <LayoutGrid size={18} />
                  </span>
                  <p
                    id="resource-modal-title"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--text-h)',
                    }}
                  >
                    {heading}
                  </p>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                  Capture the operational details here so the resource catalogue stays accurate and bookable.
                </p>
              </div>

              <button type="button" className="resource-modal-close" aria-label="Close resource dialog" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)}>
              <div style={{ display: 'grid', gap: 20 }}>
                {formError && (
                  <Alert variant="error" title="Unable to save resource">
                    {formError}
                  </Alert>
                )}

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>Basic Info</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Core identity fields used in the catalogue and booking views.</p>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <Input
                      label="Code"
                      value={values.code}
                      onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
                      error={errors.code}
                      required
                    />
                    <Input
                      label="Name"
                      value={values.name}
                      onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                      error={errors.name}
                      required
                    />
                    <Select
                      label="Category"
                      value={values.category}
                      onChange={(event) => setValues((current) => ({ ...current, category: event.target.value as ResourceCategory }))}
                      options={resourceCategoryOptions}
                    />
                    <Input
                      label="Subcategory"
                      value={values.subcategory}
                      onChange={(event) => setValues((current) => ({ ...current, subcategory: event.target.value }))}
                      error={errors.subcategory}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>Details</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Operational capacity and placement information for the resource.</p>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Textarea
                        label="Location"
                        value={values.location}
                        onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))}
                        rows={3}
                        resize="vertical"
                      />
                    </div>
                    <Input
                      label="Capacity"
                      type="number"
                      min="0"
                      value={values.capacity}
                      onChange={(event) => setValues((current) => ({ ...current, capacity: event.target.value }))}
                      error={errors.capacity}
                    />
                    <Input
                      label="Quantity"
                      type="number"
                      min="0"
                      value={values.quantity}
                      onChange={(event) => setValues((current) => ({ ...current, quantity: event.target.value }))}
                      error={errors.quantity}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>Settings</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Control whether the item is active and how it behaves in inventory workflows.</p>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <Select
                      label="Status"
                      value={values.status}
                      onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ResourceStatus }))}
                      options={resourceStatusOptions}
                    />
                    <div style={{ display: 'grid', gap: 12, alignContent: 'start', paddingTop: 26 }}>
                      <Toggle
                        label="Bookable"
                        checked={values.bookable}
                        onChange={(checked) => setValues((current) => ({ ...current, bookable: checked }))}
                      />
                      <Toggle
                        label="Movable"
                        checked={values.movable}
                        onChange={(checked) => setValues((current) => ({ ...current, movable: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>Availability</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Set an operating window when the resource should appear available.</p>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <Input
                      label="Available From"
                      type="time"
                      value={values.availableFrom}
                      onChange={(event) => setValues((current) => ({ ...current, availableFrom: event.target.value }))}
                      error={errors.availableFrom}
                    />
                    <Input
                      label="Available To"
                      type="time"
                      value={values.availableTo}
                      onChange={(event) => setValues((current) => ({ ...current, availableTo: event.target.value }))}
                      error={errors.availableTo}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <Button type="button" variant="subtle" size="sm" disabled={saving} onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="glass" size="sm" loading={saving}>
                    Save Resource
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
