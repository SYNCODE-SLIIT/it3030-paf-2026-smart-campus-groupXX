'use client';

import React from 'react';

import { Button, Card, Input, Select, Textarea, Toggle } from '@/components/ui';
import type {
  BuildingResponse,
  CreateBuildingRequest,
  UpdateBuildingRequest,
} from '@/lib/api-types';
import { buildingTypeOptions } from '@/lib/building-display';

type BuildingFormValues = {
  buildingName: string;
  buildingCode: string;
  buildingType: CreateBuildingRequest['buildingType'];
  hasWings: boolean;
  leftWingPrefix: string;
  rightWingPrefix: string;
  defaultPrefix: string;
  description: string;
  isActive: boolean;
};

type BuildingFormErrors = Partial<Record<'buildingName' | 'buildingCode' | 'leftWingPrefix' | 'rightWingPrefix' | 'defaultPrefix', string>>;

const defaultValues: BuildingFormValues = {
  buildingName: '',
  buildingCode: '',
  buildingType: 'ACADEMIC',
  hasWings: false,
  leftWingPrefix: '',
  rightWingPrefix: '',
  defaultPrefix: '',
  description: '',
  isActive: true,
};

function valuesFromBuilding(building: BuildingResponse | null): BuildingFormValues {
  if (!building) {
    return defaultValues;
  }

  return {
    buildingName: building.buildingName,
    buildingCode: building.buildingCode,
    buildingType: building.buildingType,
    hasWings: building.hasWings,
    leftWingPrefix: building.leftWingPrefix ?? '',
    rightWingPrefix: building.rightWingPrefix ?? '',
    defaultPrefix: building.defaultPrefix ?? '',
    description: building.description ?? '',
    isActive: building.isActive,
  };
}

export function BuildingFormModal({
  title,
  building,
  submitting,
  onSubmit,
  onCancel,
}: {
  title: string;
  building: BuildingResponse | null;
  submitting: boolean;
  onSubmit: (payload: CreateBuildingRequest | UpdateBuildingRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<BuildingFormValues>(() => valuesFromBuilding(building));
  const [errors, setErrors] = React.useState<BuildingFormErrors>({});

  React.useEffect(() => {
    setValues(valuesFromBuilding(building));
    setErrors({});
  }, [building]);

  function validate(next: BuildingFormValues) {
    const nextErrors: BuildingFormErrors = {};
    if (!next.buildingName.trim()) nextErrors.buildingName = 'Building name is required.';
    if (!next.buildingCode.trim()) nextErrors.buildingCode = 'Building code is required.';

    if (next.hasWings) {
      if (!next.leftWingPrefix.trim() && !next.rightWingPrefix.trim()) {
        nextErrors.leftWingPrefix = 'At least one wing prefix is required when wings are enabled.';
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateBuildingRequest | UpdateBuildingRequest = {
      buildingName: values.buildingName.trim(),
      buildingCode: values.buildingCode.trim(),
      buildingType: values.buildingType,
      hasWings: values.hasWings,
      leftWingPrefix: values.hasWings ? values.leftWingPrefix.trim() || null : null,
      rightWingPrefix: values.hasWings ? values.rightWingPrefix.trim() || null : null,
      defaultPrefix: values.hasWings ? null : values.defaultPrefix.trim() || null,
      description: values.description.trim() || null,
      isActive: values.isActive,
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
              Manage building metadata and room-prefix structure for the campus catalogue.
            </p>
          </div>
          <Button type="button" variant="subtle" size="sm" onClick={onCancel}>Close</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Building Name"
            value={values.buildingName}
            onChange={(event) => setValues((current) => ({ ...current, buildingName: event.target.value }))}
            error={errors.buildingName}
            required
          />
          <Input
            label="Building Code"
            value={values.buildingCode}
            onChange={(event) => setValues((current) => ({ ...current, buildingCode: event.target.value.toUpperCase() }))}
            error={errors.buildingCode}
            required
          />
          <Select
            label="Building Type"
            value={values.buildingType}
            onChange={(event) => setValues((current) => ({ ...current, buildingType: event.target.value as BuildingFormValues['buildingType'] }))}
            options={buildingTypeOptions}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Layout
            </p>
            <Toggle
              label="Has Wings"
              checked={values.hasWings}
              onChange={(checked) => setValues((current) => ({
                ...current,
                hasWings: checked,
                leftWingPrefix: checked ? current.leftWingPrefix : '',
                rightWingPrefix: checked ? current.rightWingPrefix : '',
                defaultPrefix: checked ? '' : current.defaultPrefix,
              }))}
            />
          </div>
          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Status
            </p>
            <Toggle
              label="Active"
              checked={values.isActive}
              onChange={(checked) => setValues((current) => ({ ...current, isActive: checked }))}
            />
          </div>
        </div>

        {values.hasWings ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Input
              label="Left Wing Prefix"
              value={values.leftWingPrefix}
              onChange={(event) => setValues((current) => ({ ...current, leftWingPrefix: event.target.value.toUpperCase() }))}
              error={errors.leftWingPrefix}
            />
            <Input
              label="Right Wing Prefix"
              value={values.rightWingPrefix}
              onChange={(event) => setValues((current) => ({ ...current, rightWingPrefix: event.target.value.toUpperCase() }))}
              error={errors.rightWingPrefix}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Input
              label="Default Prefix"
              value={values.defaultPrefix}
              onChange={(event) => setValues((current) => ({ ...current, defaultPrefix: event.target.value.toUpperCase() }))}
              error={errors.defaultPrefix}
            />
          </div>
        )}

        <Textarea
          label="Description"
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          rows={4}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="subtle" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="glass" loading={submitting}>
            {building ? 'Update Building' : 'Create Building'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
