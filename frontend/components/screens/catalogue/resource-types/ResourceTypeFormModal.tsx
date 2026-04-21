'use client';

import React from 'react';

import { Button, Card, Select, Textarea, Toggle, Input } from '@/components/ui';
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
  title,
  resourceType,
  submitting,
  onSubmit,
  onCancel,
}: {
  title: string;
  resourceType: CatalogueResourceTypeResponse | null;
  submitting: boolean;
  onSubmit: (payload: CreateResourceTypeRequest | UpdateResourceTypeRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<ResourceTypeFormValues>(() => valuesFromResourceType(resourceType));
  const [errors, setErrors] = React.useState<ResourceTypeFormErrors>({});

  React.useEffect(() => {
    setValues(valuesFromResourceType(resourceType));
    setErrors({});
  }, [resourceType]);

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

  return (
    <Card>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{title}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Define reusable catalogue types for spaces, equipment, and operational assets.
            </p>
          </div>
          <Button type="button" variant="subtle" size="sm" onClick={onCancel}>Close</Button>
        </div>

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
          <Button type="button" variant="subtle" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="glass" loading={submitting}>
            {resourceType ? 'Update Resource Type' : 'Create Resource Type'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
