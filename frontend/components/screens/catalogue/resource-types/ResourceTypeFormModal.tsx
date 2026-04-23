'use client';

import React from 'react';

import { Alert, Button, Dialog, Input, Select, Textarea, Toggle } from '@/components/ui';
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
  locationRequired: boolean;
  capacityEnabled: boolean;
  capacityRequired: boolean;
  quantityEnabled: boolean;
  availabilityEnabled: boolean;
  featuresEnabled: boolean;
};

type ResourceTypeFormErrors = Partial<Record<'code' | 'name' | 'capacityRequired', string>>;

const defaultValues: ResourceTypeFormValues = {
  code: '',
  name: '',
  category: 'GENERAL_UTILITY',
  description: '',
  isBookableDefault: false,
  isMovableDefault: false,
  locationRequired: false,
  capacityEnabled: false,
  capacityRequired: false,
  quantityEnabled: true,
  availabilityEnabled: true,
  featuresEnabled: false,
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
    locationRequired: resourceType.locationRequired,
    capacityEnabled: resourceType.capacityEnabled,
    capacityRequired: resourceType.capacityRequired,
    quantityEnabled: resourceType.quantityEnabled,
    availabilityEnabled: resourceType.availabilityEnabled,
    featuresEnabled: resourceType.featuresEnabled,
  };
}

const sectionLabelStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--text-label)',
};

const sectionCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: 16,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-2)',
};

const toggleGroupStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const toggleItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  alignContent: 'start',
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'var(--text-muted)',
};

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
    if (!next.capacityEnabled && next.capacityRequired) {
      nextErrors.capacityRequired = 'Capacity is required only when capacity is enabled.';
    }
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
      locationRequired: values.locationRequired,
      capacityEnabled: values.capacityEnabled,
      capacityRequired: values.capacityEnabled && values.capacityRequired,
      quantityEnabled: values.quantityEnabled,
      availabilityEnabled: values.availabilityEnabled,
      featuresEnabled: values.featuresEnabled,
    };

    await onSubmit(payload);
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title} size="md" closeOnBackdropClick={!submitting}>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ padding: 24, display: 'grid', gap: 16 }}>
        <div style={sectionCardStyle}>
          <p style={sectionLabelStyle}>Basic Details</p>
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
          <Textarea
            label="Description"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={4}
          />
        </div>

        <div style={sectionCardStyle}>
          <p style={sectionLabelStyle}>Default Behavior</p>
          <div style={toggleGroupStyle}>
            <div style={toggleItemStyle}>
              <Toggle
                label="Bookable By Default"
                checked={values.isBookableDefault}
                onChange={(checked) => setValues((current) => ({ ...current, isBookableDefault: checked }))}
              />
              <p style={hintStyle}>Sets the default booking behavior when resources use this type.</p>
            </div>
            <div style={toggleItemStyle}>
              <Toggle
                label="Movable By Default"
                checked={values.isMovableDefault}
                onChange={(checked) => setValues((current) => ({ ...current, isMovableDefault: checked }))}
              />
              <p style={hintStyle}>Controls whether resources of this type default to movable inventory.</p>
            </div>
          </div>
        </div>

        <div style={sectionCardStyle}>
          <p style={sectionLabelStyle}>Rule Flags</p>
          <div style={toggleGroupStyle}>
            <div style={toggleItemStyle}>
              <Toggle
                label="Location Required"
                checked={values.locationRequired}
                onChange={(checked) => setValues((current) => ({ ...current, locationRequired: checked }))}
              />
              <p style={hintStyle}>Use this when resources of this type should always be tied to a location.</p>
            </div>
            <div style={toggleItemStyle}>
              <Toggle
                label="Capacity Enabled"
                checked={values.capacityEnabled}
                onChange={(checked) =>
                  setValues((current) => ({
                    ...current,
                    capacityEnabled: checked,
                    capacityRequired: checked ? current.capacityRequired : false,
                  }))
                }
              />
              <p style={hintStyle}>Allows capacity to be captured for resources that use this type.</p>
            </div>
            <div style={toggleItemStyle}>
              <Toggle
                label="Capacity Required"
                checked={values.capacityEnabled && values.capacityRequired}
                disabled={!values.capacityEnabled}
                onChange={(checked) => setValues((current) => ({ ...current, capacityRequired: checked }))}
              />
              <p style={hintStyle}>
                {values.capacityEnabled
                  ? 'Require capacity whenever this type is used.'
                  : 'Enable capacity first to make it required.'}
              </p>
            </div>
            <div style={toggleItemStyle}>
              <Toggle
                label="Quantity Enabled"
                checked={values.quantityEnabled}
                onChange={(checked) => setValues((current) => ({ ...current, quantityEnabled: checked }))}
              />
              <p style={hintStyle}>Controls whether quantity can be managed for this resource type.</p>
            </div>
            <div style={toggleItemStyle}>
              <Toggle
                label="Availability Enabled"
                checked={values.availabilityEnabled}
                onChange={(checked) => setValues((current) => ({ ...current, availabilityEnabled: checked }))}
              />
              <p style={hintStyle}>Controls whether availability windows apply to this type.</p>
            </div>
            <div style={toggleItemStyle}>
              <Toggle
                label="Features Enabled"
                checked={values.featuresEnabled}
                onChange={(checked) => setValues((current) => ({ ...current, featuresEnabled: checked }))}
              />
              <p style={hintStyle}>Allows feature selection for resources created under this type.</p>
            </div>
          </div>
          {errors.capacityRequired && (
            <Alert variant="error" title="Invalid capacity rule">
              {errors.capacityRequired}
            </Alert>
          )}
        </div>

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
