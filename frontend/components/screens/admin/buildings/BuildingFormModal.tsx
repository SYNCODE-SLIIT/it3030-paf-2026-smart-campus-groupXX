'use client';

import React from 'react';
import { Check } from 'lucide-react';

import { Button, Dialog, Input, Select, Textarea, Toggle } from '@/components/ui';
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

const STEP_LABELS = ['Details', 'Layout'];

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
  open,
  title,
  building,
  submitting,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  building: BuildingResponse | null;
  submitting: boolean;
  onSubmit: (payload: CreateBuildingRequest | UpdateBuildingRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState(1);
  const [values, setValues] = React.useState<BuildingFormValues>(() => valuesFromBuilding(building));
  const [errors, setErrors] = React.useState<BuildingFormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    setValues(valuesFromBuilding(building));
    setErrors({});
    setStep(1);
  }, [building, open]);

  function validateStep(next: BuildingFormValues, targetStep: number) {
    const nextErrors: BuildingFormErrors = {};
    if (targetStep === 1) {
      if (!next.buildingName.trim()) nextErrors.buildingName = 'Building name is required.';
      if (!next.buildingCode.trim()) nextErrors.buildingCode = 'Building code is required.';
    }

    if (targetStep === 2 && next.hasWings) {
      if (!next.leftWingPrefix.trim() && !next.rightWingPrefix.trim()) {
        nextErrors.leftWingPrefix = 'At least one wing prefix is required when wings are enabled.';
      }
    }

    return nextErrors;
  }

  function validate(next: BuildingFormValues) {
    return {
      ...validateStep(next, 1),
      ...validateStep(next, 2),
    };
  }

  function firstErrorStep(nextErrors: BuildingFormErrors) {
    if (nextErrors.buildingName || nextErrors.buildingCode) return 1;
    return 2;
  }

  function handleNext() {
    const nextErrors = validateStep(values, step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep(2);
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(firstErrorStep(nextErrors));
      return;
    }

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
    <Dialog open={open} onClose={handleClose} title={title} size="md" closeOnBackdropClick={!submitting}>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ padding: 24, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {([1, 2] as const).map((s) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: s < step ? 'var(--green-500)' : s === step ? 'var(--yellow-400)' : 'var(--surface-2)',
                    border: s > step ? '1.5px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: s === step ? 'var(--yellow-900)' : s < step ? '#fff' : 'var(--text-muted)',
                    flexShrink: 0,
                    transition: 'background .2s',
                  }}
                >
                  {s < step ? <Check size={12} strokeWidth={3} /> : s}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: s === step ? 700 : 400,
                    color: s === step ? 'var(--text-h)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {STEP_LABELS[s - 1]}
                </span>
              </div>
              {s < 2 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: s < step ? 'var(--green-500)' : 'var(--border)',
                    transition: 'background .2s',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'grid', gap: 14 }}>
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
            <Textarea
              label="Description"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              rows={4}
            />
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
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 14 }}>
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
              <Input
                label="Default Prefix"
                value={values.defaultPrefix}
                onChange={(event) => setValues((current) => ({ ...current, defaultPrefix: event.target.value.toUpperCase() }))}
                error={errors.defaultPrefix}
              />
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div>
            {step > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} disabled={submitting}>
                Back
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="subtle" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            {step < 2 ? (
              <Button type="button" size="sm" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" size="sm" variant="glass" loading={submitting}>
                {building ? 'Update Building' : 'Create Building'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
