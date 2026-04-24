'use client';

import React from 'react';
import { Check } from 'lucide-react';

import { Alert, Button, Checkbox, Dialog, Input, Select, Textarea, Toggle } from '@/components/ui';
import type {
  AvailabilityWindowInput,
  CreateResourceRequest,
  DayOfWeek,
  LocationOption,
  ManagedByRoleOption,
  ResourceFeatureOption,
  ResourceManagedByRole,
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

type AvailabilityWindowFormValue = {
  dayOfWeek: DayOfWeek | '';
  startTime: string;
  endTime: string;
};

type AvailabilityWindowFormErrors = Partial<Record<'dayOfWeek' | 'startTime' | 'endTime', string>>;

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
  availabilityWindows: AvailabilityWindowFormValue[];
};

type ResourceFormErrors = Partial<
  Record<'code' | 'name' | 'resourceTypeId' | 'locationId' | 'capacity' | 'quantity' | 'availabilityWindows', string>
> & {
  availabilityWindowRows?: AvailabilityWindowFormErrors[];
};

const DAY_OF_WEEK_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

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
  availabilityWindows: [],
};

const STEP_LABELS = ['Basics', 'Availability', 'Features'];

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalTime(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isLocationRelevant(resourceType: ResourceTypeOption | null) {
  if (!resourceType) {
    return true;
  }

  return resourceType.locationRequired || resourceType.category === 'SPACES' || !resourceType.isMovableDefault;
}

function emptyAvailabilityWindow(): AvailabilityWindowFormValue {
  return {
    dayOfWeek: '',
    startTime: '',
    endTime: '',
  };
}

function deriveAvailabilityWindows(resource: ResourceResponse | null): AvailabilityWindowFormValue[] {
  if (!resource) {
    return [];
  }

  if (resource.availabilityWindows?.length) {
    return resource.availabilityWindows.map((availabilityWindow) => ({
      dayOfWeek: availabilityWindow.dayOfWeek,
      startTime: availabilityWindow.startTime ?? '',
      endTime: availabilityWindow.endTime ?? '',
    }));
  }

  if (resource.availableFrom && resource.availableTo) {
    return DAY_OF_WEEK_OPTIONS.map((dayOption) => ({
      dayOfWeek: dayOption.value,
      startTime: resource.availableFrom ?? '',
      endTime: resource.availableTo ?? '',
    }));
  }

  return [];
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
    availabilityWindows: deriveAvailabilityWindows(resource),
  };
}

function hasAvailabilityWindowErrors(rowErrors: AvailabilityWindowFormErrors[] | undefined) {
  return Boolean(rowErrors?.some((rowError) => Object.keys(rowError).length > 0));
}

export function ResourceFormModal({
  open,
  title,
  resource,
  submitting,
  resourceTypeOptions,
  locationOptions,
  featureOptions,
  managedByRoleOptions,
  lookupsLoading,
  lookupError,
  onValidateCode,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  resource: ResourceResponse | null;
  submitting: boolean;
  resourceTypeOptions: ResourceTypeOption[];
  locationOptions: LocationOption[];
  featureOptions: ResourceFeatureOption[];
  managedByRoleOptions: ManagedByRoleOption[];
  lookupsLoading: boolean;
  lookupError: string | null;
  onValidateCode: (code: string) => Promise<string | null>;
  onSubmit: (payload: CreateResourceRequest | UpdateResourceRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState(1);
  const [values, setValues] = React.useState<ResourceFormValues>(() => valuesFromResource(resource));
  const [errors, setErrors] = React.useState<ResourceFormErrors>({});
  const [managedByRoleTouched, setManagedByRoleTouched] = React.useState(false);
  const [validatingCode, setValidatingCode] = React.useState(false);

  const selectedResourceType = React.useMemo(
    () => resourceTypeOptions.find((option) => option.id === values.resourceTypeId) ?? null,
    [resourceTypeOptions, values.resourceTypeId],
  );
  const showLocation = isLocationRelevant(selectedResourceType);
  const showCapacity = Boolean(selectedResourceType?.capacityEnabled);
  const showQuantity = Boolean(selectedResourceType?.quantityEnabled);
  const showFeatures = Boolean(selectedResourceType?.featuresEnabled);
  const showAvailability = Boolean(selectedResourceType?.availabilityEnabled);

  React.useEffect(() => {
    if (!open) return;
    setValues(valuesFromResource(resource));
    setErrors({});
    setManagedByRoleTouched(false);
    setStep(1);
  }, [open, resource]);

  function applyTypeDrivenValues(current: ResourceFormValues, resourceTypeId: string): ResourceFormValues {
    const nextResourceType = resourceTypeOptions.find((option) => option.id === resourceTypeId) ?? null;
    const nextShowLocation = isLocationRelevant(nextResourceType);

    return {
      ...current,
      resourceTypeId,
      bookable: nextResourceType?.isBookableDefault ?? current.bookable,
      movable: nextResourceType?.isMovableDefault ?? current.movable,
      locationId: nextShowLocation ? current.locationId : '',
      capacity: nextResourceType?.capacityEnabled ? current.capacity : '',
      quantity: nextResourceType?.quantityEnabled ? current.quantity : '',
      featureCodes: nextResourceType?.featuresEnabled ? current.featureCodes : [],
      availabilityWindows: nextResourceType?.availabilityEnabled ? current.availabilityWindows : [],
    };
  }

  function validateStep(next: ResourceFormValues, targetStep: number) {
    const nextErrors: ResourceFormErrors = {};
    const nextResourceType = resourceTypeOptions.find((option) => option.id === next.resourceTypeId) ?? null;
    const nextShowLocation = isLocationRelevant(nextResourceType);
    const nextShowCapacity = Boolean(nextResourceType?.capacityEnabled);
    const nextShowQuantity = Boolean(nextResourceType?.quantityEnabled);
    const nextShowAvailability = Boolean(nextResourceType?.availabilityEnabled);

    if (targetStep === 1) {
      if (!resource && !next.code.trim()) nextErrors.code = 'Code is required.';
      if (!resource && next.code.trim() && !/^[A-Z0-9]+$/.test(next.code.trim())) {
        nextErrors.code = 'Code can contain only letters and numbers.';
      }
      if (!next.name.trim()) nextErrors.name = 'Name is required.';
      if (!next.resourceTypeId) nextErrors.resourceTypeId = 'Resource type is required.';
    }

    if (targetStep === 2) {
      if (nextResourceType?.locationRequired && nextShowLocation && !next.locationId) {
        nextErrors.locationId = 'Location is required for this resource type.';
      }

      if (nextShowCapacity) {
        if (nextResourceType?.capacityRequired && !next.capacity.trim()) {
          nextErrors.capacity = 'Capacity is required for this resource type.';
        } else if (next.capacity.trim() && !/^\d+$/.test(next.capacity.trim())) {
          nextErrors.capacity = 'Capacity must be a non-negative whole number.';
        } else if (next.capacity.trim() && (parseOptionalNumber(next.capacity) ?? -1) < 0) {
          nextErrors.capacity = 'Capacity must be greater than or equal to 0.';
        }
      }

      if (nextShowQuantity && next.quantity.trim() && parseOptionalNumber(next.quantity) === null) {
        nextErrors.quantity = 'Quantity must be a valid number.';
      }

      if (nextShowAvailability) {
        const rowErrors = next.availabilityWindows.map<AvailabilityWindowFormErrors>(() => ({}));
        const seenWindows = new Set<string>();

        next.availabilityWindows.forEach((availabilityWindow, index) => {
          const normalizedDayOfWeek = availabilityWindow.dayOfWeek;
          const normalizedStartTime = parseOptionalTime(availabilityWindow.startTime);
          const normalizedEndTime = parseOptionalTime(availabilityWindow.endTime);

          if (!normalizedDayOfWeek) {
            rowErrors[index].dayOfWeek = 'Select a day.';
          }
          if (!normalizedStartTime) {
            rowErrors[index].startTime = 'Start time is required.';
          }
          if (!normalizedEndTime) {
            rowErrors[index].endTime = 'End time is required.';
          }

          if (!rowErrors[index].startTime && !rowErrors[index].endTime && normalizedStartTime && normalizedEndTime) {
            if (normalizedStartTime >= normalizedEndTime) {
              rowErrors[index].endTime = 'End time must be after the start time.';
            } else {
              const availabilityKey = `${normalizedDayOfWeek}:${normalizedStartTime}:${normalizedEndTime}`;
              if (seenWindows.has(availabilityKey)) {
                rowErrors[index].dayOfWeek = 'Duplicate availability window.';
                nextErrors.availabilityWindows = 'Duplicate availability windows are not allowed.';
              } else {
                seenWindows.add(availabilityKey);
              }
            }
          }
        });

        if (hasAvailabilityWindowErrors(rowErrors)) {
          nextErrors.availabilityWindowRows = rowErrors;
        }
      }
    }

    return nextErrors;
  }

  function validate(next: ResourceFormValues) {
    return {
      ...validateStep(next, 1),
      ...validateStep(next, 2),
    };
  }

  function firstErrorStep(nextErrors: ResourceFormErrors) {
    if (nextErrors.code || nextErrors.name || nextErrors.resourceTypeId) return 1;
    if (
      nextErrors.locationId
      || nextErrors.capacity
      || nextErrors.quantity
      || nextErrors.availabilityWindows
      || hasAvailabilityWindowErrors(nextErrors.availabilityWindowRows)
    ) return 2;
    return 3;
  }

  async function handleNext() {
    const nextErrors = validateStep(values, step);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (step === 1 && !resource) {
      setValidatingCode(true);
      try {
        const normalizedCode = values.code.trim().toUpperCase();
        const codeError = await onValidateCode(normalizedCode);
        if (codeError) {
          setErrors((current) => ({ ...current, code: codeError }));
          return;
        }
      } finally {
        setValidatingCode(false);
      }
    }

    setErrors({});
    setStep((current) => Math.min(3, current + 1));
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (step < 3) {
      await handleNext();
      return;
    }

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(firstErrorStep(nextErrors));
      return;
    }

    const normalizedLocationId = showLocation ? (values.locationId || null) : null;
    const normalizedCapacity = showCapacity ? parseOptionalNumber(values.capacity) : null;
    const normalizedQuantity = showQuantity ? parseOptionalNumber(values.quantity) : null;
    const normalizedFeatureCodes = showFeatures ? values.featureCodes : [];
    const normalizedAvailabilityWindows: AvailabilityWindowInput[] = showAvailability
      ? values.availabilityWindows.map((availabilityWindow) => ({
          dayOfWeek: availabilityWindow.dayOfWeek as DayOfWeek,
          startTime: parseOptionalTime(availabilityWindow.startTime) ?? '',
          endTime: parseOptionalTime(availabilityWindow.endTime) ?? '',
        }))
      : [];

    if (!resource) {
      const payload: CreateResourceRequest = {
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description.trim() || null,
        resourceTypeId: values.resourceTypeId,
        locationId: normalizedLocationId,
        capacity: normalizedCapacity,
        quantity: normalizedQuantity,
        status: values.status,
        bookable: values.bookable,
        movable: values.movable,
        availableFrom: null,
        availableTo: null,
        managedByRole: (values.managedByRole || 'CATALOG_MANAGER') as ResourceManagedByRole,
        featureCodes: normalizedFeatureCodes,
        availabilityWindows: normalizedAvailabilityWindows,
      };

      await onSubmit(payload);
      return;
    }

    const payload: UpdateResourceRequest = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      resourceTypeId: values.resourceTypeId,
      locationId: normalizedLocationId,
      capacity: normalizedCapacity,
      quantity: normalizedQuantity,
      status: values.status,
      bookable: values.bookable,
      movable: values.movable,
      availableFrom: null,
      availableTo: null,
      featureCodes: normalizedFeatureCodes,
      availabilityWindows: normalizedAvailabilityWindows,
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
    { value: '', label: 'Default (Catalog Manager)' },
    ...managedByRoleOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  const dayOfWeekSelectOptions = [
    { value: '', label: 'Select day' },
    ...DAY_OF_WEEK_OPTIONS,
  ];

  return (
    <Dialog open={open} onClose={handleClose} title={title} size="lg" closeOnBackdropClick={!submitting}>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ padding: 24, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {([1, 2, 3] as const).map((s) => (
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
              {s < 3 && (
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

        {lookupError && (
          <Alert variant="error" title="Lookup data unavailable">
            {lookupError}
          </Alert>
        )}

        {resource && step === 1 && (
          <Alert variant="info" title="Code is read-only on existing resources">
            The backend update contract does not currently support changing a resource code.
          </Alert>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <Input
                label="Code"
                value={values.code}
                onChange={(event) => {
                  const normalizedCode = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setValues((current) => ({ ...current, code: normalizedCode }));
                  if (errors.code) {
                    setErrors((current) => ({ ...current, code: undefined }));
                  }
                }}
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
                onChange={(event) => setValues((current) => applyTypeDrivenValues(current, event.target.value))}
                options={resourceTypeSelectOptions}
                error={errors.resourceTypeId}
                disabled={lookupsLoading}
              />
            </div>
            <Textarea
              label="Description"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              rows={4}
            />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {showLocation && (
                <Select
                  label={selectedResourceType?.locationRequired ? 'Location' : 'Location (Optional)'}
                  value={values.locationId}
                  onChange={(event) => setValues((current) => ({ ...current, locationId: event.target.value }))}
                  options={locationSelectOptions}
                  error={errors.locationId}
                  disabled={lookupsLoading}
                  hint={selectedResourceType?.locationRequired ? 'Required by the selected resource type.' : undefined}
                />
              )}
              {showCapacity && (
                <Input
                  label={selectedResourceType?.capacityRequired ? 'Capacity' : 'Capacity (Optional)'}
                  type="number"
                  min={0}
                  value={values.capacity}
                  onChange={(event) => {
                    const normalizedCapacity = event.target.value.replace(/[^\d]/g, '');
                    setValues((current) => ({ ...current, capacity: normalizedCapacity }));
                  }}
                  error={errors.capacity}
                  hint={selectedResourceType?.capacityRequired ? 'Required by the selected resource type.' : undefined}
                />
              )}
              {showQuantity && (
                <Input
                  label="Quantity"
                  type="number"
                  min={0}
                  value={values.quantity}
                  onChange={(event) => setValues((current) => ({ ...current, quantity: event.target.value }))}
                  error={errors.quantity}
                />
              )}
              <Select
                label="Status"
                value={values.status}
                onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ResourceStatus }))}
                options={resourceStatusOptions}
              />
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
            {showAvailability && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
                      Availability Windows
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      Add one row per active day and time range.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      setErrors((current) => ({ ...current, availabilityWindows: undefined, availabilityWindowRows: undefined }));
                      setValues((current) => ({
                        ...current,
                        availabilityWindows: [...current.availabilityWindows, emptyAvailabilityWindow()],
                      }));
                    }}
                  >
                    Add Window
                  </Button>
                </div>
                {errors.availabilityWindows && (
                  <Alert variant="error" title="Availability windows need attention">
                    {errors.availabilityWindows}
                  </Alert>
                )}
                {values.availabilityWindows.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No availability windows added. Leave it empty to keep the resource available without a stored schedule.
                  </span>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {values.availabilityWindows.map((availabilityWindow, index) => {
                      const rowErrors = errors.availabilityWindowRows?.[index] ?? {};
                      return (
                        <div
                          key={`${availabilityWindow.dayOfWeek || 'blank'}-${index}`}
                          style={{
                            display: 'grid',
                            gap: 12,
                            padding: 14,
                            border: '1.5px solid var(--input-border)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--input-bg)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)' }}>
                              Window {index + 1}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setValues((current) => ({
                                  ...current,
                                  availabilityWindows: current.availabilityWindows.filter((_, rowIndex) => rowIndex !== index),
                                }));
                                setErrors((current) => ({
                                  ...current,
                                  availabilityWindows: undefined,
                                  availabilityWindowRows: current.availabilityWindowRows?.filter((_, rowIndex) => rowIndex !== index),
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                            <Select
                              label="Day"
                              value={availabilityWindow.dayOfWeek}
                              onChange={(event) => {
                                const nextDayOfWeek = event.target.value as DayOfWeek | '';
                                setValues((current) => ({
                                  ...current,
                                  availabilityWindows: current.availabilityWindows.map((currentWindow, rowIndex) => (
                                    rowIndex === index ? { ...currentWindow, dayOfWeek: nextDayOfWeek } : currentWindow
                                  )),
                                }));
                              }}
                              options={dayOfWeekSelectOptions}
                              error={rowErrors.dayOfWeek}
                            />
                            <Input
                              label="Start Time"
                              type="time"
                              value={availabilityWindow.startTime}
                              onChange={(event) => {
                                const nextStartTime = event.target.value;
                                setValues((current) => ({
                                  ...current,
                                  availabilityWindows: current.availabilityWindows.map((currentWindow, rowIndex) => (
                                    rowIndex === index ? { ...currentWindow, startTime: nextStartTime } : currentWindow
                                  )),
                                }));
                              }}
                              error={rowErrors.startTime}
                            />
                            <Input
                              label="End Time"
                              type="time"
                              value={availabilityWindow.endTime}
                              onChange={(event) => {
                                const nextEndTime = event.target.value;
                                setValues((current) => ({
                                  ...current,
                                  availabilityWindows: current.availabilityWindows.map((currentWindow, rowIndex) => (
                                    rowIndex === index ? { ...currentWindow, endTime: nextEndTime } : currentWindow
                                  )),
                                }));
                              }}
                              error={rowErrors.endTime}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!showAvailability && selectedResourceType && (
              <Alert variant="info" title="Availability windows are not used for this type">
                The selected resource type does not support availability scheduling, so this section is hidden.
              </Alert>
            )}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <Select
              label="Managed By Role"
              value={values.managedByRole}
              onChange={(event) => {
                setManagedByRoleTouched(true);
                setValues((current) => ({ ...current, managedByRole: event.target.value }));
              }}
              options={managedByRoleSelectOptions}
              disabled={lookupsLoading || Boolean(lookupError)}
              hint={!resource ? undefined : 'Choose a value only if you want to change the current managed role.'}
            />
            {showFeatures && (
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
            )}
            {!showFeatures && selectedResourceType && (
              <Alert variant="info" title="Features are not used for this type">
                The selected resource type does not support feature tags, so this section is hidden.
              </Alert>
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep((current) => current - 1)} disabled={submitting}>
                Back
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="subtle" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button type="button" size="sm" onClick={() => void handleNext()} disabled={lookupsLoading || validatingCode}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="glass"
                loading={submitting}
                disabled={lookupsLoading}
                onClick={() => void handleSubmit()}
              >
                {resource ? 'Update Resource' : 'Create Resource'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
