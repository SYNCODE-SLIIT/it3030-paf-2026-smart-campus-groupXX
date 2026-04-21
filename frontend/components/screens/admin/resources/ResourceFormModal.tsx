'use client';

import React from 'react';

import { Alert, Button, Card, Checkbox, Input, Select, Textarea, Toggle } from '@/components/ui';
import type {
  CreateResourceRequest,
  LocationOption,
  ManagedByRoleOption,
  ResourceManagedByRole,
  ResourceFeatureOption,
  ResourceResponse,
  ResourceStatus,
  ResourceTypeOption,
  UpdateResourceRequest,
} from '@/lib/api-types';
import {
  formatLocationOptionLabel,
  formatResourceTypeOptionLabel,
  resourceStatusOptions,
} from '@/lib/resource-display';

type ResourceFormValues = {
  code: string;
  name: string;
  description: string;
  resourceTypeId: string;
  locationId: string;
  capacity: string;
  quantity: string;
  status: ResourceStatus;
  bookable: boolean;
  movable: boolean;
  managedByRole: string;
  featureCodes: string[];
};

type ResourceFormErrors = Partial<Record<'code' | 'name' | 'resourceTypeId' | 'locationId' | 'capacity' | 'quantity', string>>;

const defaultValues: ResourceFormValues = {
  code: '',
  name: '',
  description: '',
  resourceTypeId: '',
  locationId: '',
  capacity: '',
  quantity: '',
  status: 'ACTIVE',
  bookable: true,
  movable: false,
  managedByRole: '',
  featureCodes: [],
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
    description: resource.description ?? '',
    resourceTypeId: resource.resourceType?.id ?? '',
    locationId: resource.locationDetails?.id ?? '',
    capacity: resource.capacity === null ? '' : String(resource.capacity),
    quantity: resource.quantity === null ? '' : String(resource.quantity),
    status: resource.status,
    bookable: resource.bookable,
    movable: resource.movable,
    managedByRole: '',
    featureCodes: resource.features?.map((feature) => feature.code) ?? [],
  };
}

export function ResourceFormModal({
  title,
  resource,
  submitting,
  resourceTypeOptions,
  locationOptions,
  featureOptions,
  managedByRoleOptions,
  lookupsLoading,
  lookupError,
  onSubmit,
  onCancel,
}: {
  title: string;
  resource: ResourceResponse | null;
  submitting: boolean;
  resourceTypeOptions: ResourceTypeOption[];
  locationOptions: LocationOption[];
  featureOptions: ResourceFeatureOption[];
  managedByRoleOptions: ManagedByRoleOption[];
  lookupsLoading: boolean;
  lookupError: string | null;
  onSubmit: (payload: CreateResourceRequest | UpdateResourceRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<ResourceFormValues>(() => valuesFromResource(resource));
  const [errors, setErrors] = React.useState<ResourceFormErrors>({});
  const [managedByRoleTouched, setManagedByRoleTouched] = React.useState(false);

  React.useEffect(() => {
    setValues(valuesFromResource(resource));
    setErrors({});
    setManagedByRoleTouched(false);
  }, [resource]);

  function validate(next: ResourceFormValues) {
    const nextErrors: ResourceFormErrors = {};
    if (!resource && !next.code.trim()) nextErrors.code = 'Code is required.';
    if (!next.name.trim()) nextErrors.name = 'Name is required.';
    if (!next.resourceTypeId) nextErrors.resourceTypeId = 'Resource type is required.';
    if (!next.locationId) nextErrors.locationId = 'Location is required.';
    if (next.capacity.trim() && parseOptionalNumber(next.capacity) === null) nextErrors.capacity = 'Capacity must be a valid number.';
    if (next.quantity.trim() && parseOptionalNumber(next.quantity) === null) nextErrors.quantity = 'Quantity must be a valid number.';
    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!resource) {
      const payload: CreateResourceRequest = {
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description.trim() || null,
        resourceTypeId: values.resourceTypeId,
        locationId: values.locationId,
        capacity: parseOptionalNumber(values.capacity),
        quantity: parseOptionalNumber(values.quantity),
        status: values.status,
        bookable: values.bookable,
        movable: values.movable,
        managedByRole: (values.managedByRole || null) as ResourceManagedByRole | null,
        featureCodes: values.featureCodes,
      };

      await onSubmit(payload);
      return;
    }

    const payload: UpdateResourceRequest = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      resourceTypeId: values.resourceTypeId,
      locationId: values.locationId,
      capacity: parseOptionalNumber(values.capacity),
      quantity: parseOptionalNumber(values.quantity),
      status: values.status,
      bookable: values.bookable,
      movable: values.movable,
      featureCodes: values.featureCodes,
    };

    if (managedByRoleTouched) {
      payload.managedByRole = (values.managedByRole || null) as ResourceManagedByRole | null;
    }

    await onSubmit(payload);
  }

  const resourceTypeSelectOptions = [
    { value: '', label: lookupsLoading ? 'Loading resource types...' : 'Select resource type' },
    ...resourceTypeOptions.map((option) => ({
      value: option.id,
      label: formatResourceTypeOptionLabel(option),
    })),
  ];

  const locationSelectOptions = [
    { value: '', label: lookupsLoading ? 'Loading locations...' : 'Select location' },
    ...locationOptions.map((option) => ({
      value: option.id,
      label: formatLocationOptionLabel(option),
    })),
  ];

  const managedByRoleSelectOptions = [
    { value: '', label: 'No managed role' },
    ...managedByRoleOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <Card>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{title}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Manage the normalized catalogue entry using resource types, locations, and reusable features.
            </p>
          </div>
          <Button type="button" variant="subtle" size="sm" onClick={onCancel}>Close</Button>
        </div>

        {lookupError && (
          <Alert variant="error" title="Lookup data unavailable">
            {lookupError}
          </Alert>
        )}

        {resource && (
          <Alert variant="info" title="Code is read-only on existing resources">
            The backend update contract does not currently support changing a resource code, so it is shown for reference only.
          </Alert>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Code"
            value={values.code}
            onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
            error={errors.code}
            required={!resource}
            disabled={Boolean(resource)}
          />
          <Input
            label="Name"
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            error={errors.name}
            required
          />
          <Select
            label="Resource Type"
            value={values.resourceTypeId}
            onChange={(event) => setValues((current) => ({ ...current, resourceTypeId: event.target.value }))}
            options={resourceTypeSelectOptions}
            error={errors.resourceTypeId}
            disabled={lookupsLoading}
          />
          <Select
            label="Status"
            value={values.status}
            onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ResourceStatus }))}
            options={resourceStatusOptions}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Select
            label="Location"
            value={values.locationId}
            onChange={(event) => setValues((current) => ({ ...current, locationId: event.target.value }))}
            options={locationSelectOptions}
            error={errors.locationId}
            disabled={lookupsLoading}
          />
          <Select
            label="Managed By Role"
            value={values.managedByRole}
            onChange={(event) => {
              setManagedByRoleTouched(true);
              setValues((current) => ({ ...current, managedByRole: event.target.value }));
            }}
            options={managedByRoleSelectOptions}
            disabled={lookupsLoading || Boolean(lookupError)}
            hint={!resource ? undefined : 'Current managed role is not returned by the resource response yet; choose a value only if you want to change it.'}
          />
          <Input
            label="Capacity"
            type="number"
            min={0}
            value={values.capacity}
            onChange={(event) => setValues((current) => ({ ...current, capacity: event.target.value }))}
            error={errors.capacity}
          />
          <Input
            label="Quantity"
            type="number"
            min={0}
            value={values.quantity}
            onChange={(event) => setValues((current) => ({ ...current, quantity: event.target.value }))}
            error={errors.quantity}
          />
        </div>

        <Textarea
          label="Description"
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          rows={4}
        />

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Features
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                padding: 14,
                border: '1.5px solid var(--input-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--input-bg)',
              }}
            >
              {featureOptions.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {lookupsLoading ? 'Loading feature options...' : 'No feature options are available yet.'}
                </span>
              ) : (
                featureOptions.map((feature) => (
                  <Checkbox
                    key={feature.code}
                    label={feature.name}
                    checked={values.featureCodes.includes(feature.code)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setValues((current) => ({
                        ...current,
                        featureCodes: checked
                          ? [...current.featureCodes, feature.code]
                          : current.featureCodes.filter((code) => code !== feature.code),
                      }));
                    }}
                  />
                ))
              )}
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>
            Feature selection uses the existing checkbox pattern for now so multi-select stays simple and consistent with the current UI.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Booking
            </p>
            <Toggle
              label="Bookable"
              checked={values.bookable}
              onChange={(checked) => setValues((current) => ({ ...current, bookable: checked }))}
            />
          </div>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Mobility
            </p>
            <Toggle
              label="Movable"
              checked={values.movable}
              onChange={(checked) => setValues((current) => ({ ...current, movable: checked }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="subtle" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="glass" loading={submitting} disabled={lookupsLoading}>
            {resource ? 'Update Resource' : 'Create Resource'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
