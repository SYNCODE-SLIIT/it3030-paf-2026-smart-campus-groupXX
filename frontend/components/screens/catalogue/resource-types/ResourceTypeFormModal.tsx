'use client';

import React from 'react';

import { Button, Dialog, Select, Textarea, Toggle, Input } from '@/components/ui';
import type {
  CatalogueResourceTypeResponse,
  CreateResourceTypeRequest,
  ResourceCategory,
  UpdateResourceTypeRequest,
} from '@/lib/api-types';
import { resourceCategoryOptions } from '@/lib/resource-display';

type ResourceTypeFormValues = {
  code: string;
  name: string;
  category: ResourceCategory;
  description: string;
  isBookableDefault: boolean;
  isMovableDefault: boolean;
};

type ResourceTypeFormErrors = Partial<Record<'code' | 'name', string>>;

const defaultValues: ResourceTypeFormValues = {
  code: '',
  name: '',
  category: 'GENERAL_UTILITY',
  description: '',
  isBookableDefault: false,
  isMovableDefault: false,
};

function valuesFromResourceType(resourceType: CatalogueResourceTypeResponse | null): ResourceTypeFormValues {
  if (!resourceType) {
    return defaultValues;
  }

  return {
    code: resourceType.code,
    name: resourceType.name,
    category: resourceType.category,
    description: resourceType.description ?? '',
    isBookableDefault: resourceType.isBookableDefault,
    isMovableDefault: resourceType.isMovableDefault,
  };
}

export function ResourceTypeFormModal({
  open,
  title,
  resourceType,
  submitting,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  resourceType: CatalogueResourceTypeResponse | null;
  submitting: boolean;
  onSubmit: (payload: CreateResourceTypeRequest | UpdateResourceTypeRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = React.useState<ResourceTypeFormValues>(() => valuesFromResourceType(resourceType));
  const [errors, setErrors] = React.useState<ResourceTypeFormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    setValues(valuesFromResourceType(resourceType));
    setErrors({});
  }, [open, resourceType]);

  function validate(next: ResourceTypeFormValues) {
    const nextErrors: ResourceTypeFormErrors = {};
    if (!next.code.trim()) nextErrors.code = 'Code is required.';
    if (!next.name.trim()) nextErrors.name = 'Name is required.';
    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateResourceTypeRequest | UpdateResourceTypeRequest = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim() || null,
      isBookableDefault: values.isBookableDefault,
      isMovableDefault: values.isMovableDefault,
    };

    await onSubmit(payload);
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title} size="sm" closeOnBackdropClick={!submitting}>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ padding: 24, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Code"
            value={values.code}
            onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Defaults
            </p>
            <Toggle
              label="Bookable By Default"
              checked={values.isBookableDefault}
              onChange={(checked) => setValues((current) => ({ ...current, isBookableDefault: checked }))}
            />
          </div>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Mobility
            </p>
            <Toggle
              label="Movable By Default"
              checked={values.isMovableDefault}
              onChange={(checked) => setValues((current) => ({ ...current, isMovableDefault: checked }))}
            />
          </div>
        </div>

        <Textarea
          label="Description"
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          rows={4}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="subtle" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="glass" loading={submitting}>
            {resourceType ? 'Update Resource Type' : 'Create Resource Type'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
