'use client';

import React from 'react';

import { Alert, Button, Card, Input, Select, Textarea } from '@/components/ui';
import type {
  BuildingResponse,
  CatalogueLocationResponse,
  CreateLocationRequest,
  LocationType,
  LocationWing,
  UpdateLocationRequest,
} from '@/lib/api-types';
import {
  buildLocationCode,
  extractCodeSuffixFromStoredCode,
  formatBuildingOptionLabel,
  getLocationCodeGuidance,
  locationTypeOptions,
  locationTypeRequiresWing,
  normalizeFloorValue,
  normalizeCodeSuffixInput,
  resolveLocationCodePrefix,
  wingOptions,
} from '@/lib/location-display';

type LocationFormValues = {
  buildingId: string;
  wing: LocationWing | '';
  floor: string;
  codeSuffix: string;
  locationName: string;
  locationType: LocationType;
  description: string;
};

type LocationFormErrors = Partial<Record<'buildingId' | 'wing' | 'floor' | 'codeSuffix' | 'locationName', string>>;

const defaultValues: LocationFormValues = {
  buildingId: '',
  wing: 'NONE',
  floor: '1',
  codeSuffix: '',
  locationName: '',
  locationType: 'ROOM',
  description: '',
};

function valuesFromLocation(location: CatalogueLocationResponse | null): LocationFormValues {
  if (!location) {
    return defaultValues;
  }

  return {
    buildingId: location.buildingId ?? '',
    wing: location.wing ?? 'NONE',
    floor: normalizeFloorValue(location.floor),
    codeSuffix: '',
    locationName: location.locationName,
    locationType: location.locationType,
    description: location.description ?? '',
  };
}

export function LocationFormModal({
  title,
  location,
  buildingOptions,
  existingLocations,
  submitting,
  onSubmit,
  onCancel,
}: {
  title: string;
  location: CatalogueLocationResponse | null;
  buildingOptions: BuildingResponse[];
  existingLocations: CatalogueLocationResponse[];
  submitting: boolean;
  onSubmit: (payload: CreateLocationRequest | UpdateLocationRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<LocationFormValues>(() => valuesFromLocation(location));
  const [errors, setErrors] = React.useState<LocationFormErrors>({});

  const selectedBuilding = React.useMemo(
    () => buildingOptions.find((building) => building.id === values.buildingId) ?? null,
    [buildingOptions, values.buildingId],
  );

  React.useEffect(() => {
    const nextValues = valuesFromLocation(location);
    const nextBuilding = buildingOptions.find((building) => building.id === nextValues.buildingId) ?? null;
    nextValues.codeSuffix = extractCodeSuffixFromStoredCode(
      nextBuilding,
      nextValues.wing,
      nextValues.floor,
      location?.roomCode,
      nextValues.locationType,
    );
    setValues(nextValues);
    setErrors({});
  }, [buildingOptions, location]);

  const shouldShowWing = React.useMemo(
    () => Boolean(selectedBuilding?.hasWings),
    [selectedBuilding],
  );

  const normalizedFloor = React.useMemo(
    () => normalizeFloorValue(values.floor),
    [values.floor],
  );

  const finalLocationCode = React.useMemo(
    () => buildLocationCode(selectedBuilding, values.wing, normalizedFloor, values.codeSuffix, values.locationType),
    [normalizedFloor, selectedBuilding, values.codeSuffix, values.locationType, values.wing],
  );

  function validate(next: LocationFormValues) {
    const nextErrors: LocationFormErrors = {};
    const nextBuilding = buildingOptions.find((building) => building.id === next.buildingId) ?? null;
    const nextFloor = normalizeFloorValue(next.floor);
    const nextFinalCode = buildLocationCode(nextBuilding, next.wing, nextFloor, next.codeSuffix, next.locationType);

    if (!next.buildingId) nextErrors.buildingId = 'Building is required.';
    if (!next.locationName.trim()) nextErrors.locationName = 'Location name is required.';
    if (nextFloor && !/^\d+$/.test(nextFloor)) {
      nextErrors.floor = 'Floor must be numeric.';
    }
    if (locationTypeRequiresWing(nextBuilding) && !next.wing) {
      nextErrors.wing = 'Wing is required for the selected building.';
    }
    if (!next.codeSuffix.trim()) {
      nextErrors.codeSuffix = 'Code suffix is required.';
    }

    const prefix = resolveLocationCodePrefix(nextBuilding, next.wing, next.locationType);
    if (!prefix && nextBuilding) {
      nextErrors.codeSuffix = 'This building does not have enough prefix information to derive a valid code.';
    }

    if (nextFinalCode) {
      const duplicateLocation = existingLocations.find((existingLocation) =>
        existingLocation.roomCode?.toUpperCase() === nextFinalCode.toUpperCase()
          && existingLocation.id !== location?.id,
      );
      if (duplicateLocation) {
        nextErrors.codeSuffix = `Location code ${nextFinalCode} already exists.`;
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nextFloor = normalizeFloorValue(values.floor);
    const nextFinalCode = buildLocationCode(selectedBuilding, values.wing, nextFloor, values.codeSuffix, values.locationType);
    if (!nextFinalCode) {
      setErrors({ codeSuffix: 'A valid location code could not be generated from the selected building.' });
      return;
    }

    const payload: CreateLocationRequest | UpdateLocationRequest = {
      buildingId: values.buildingId,
      wing: selectedBuilding?.hasWings ? (values.wing || null) : 'NONE',
      floor: nextFloor,
      roomCode: nextFinalCode,
      locationName: values.locationName.trim(),
      locationType: values.locationType,
      description: values.description.trim() || null,
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
              Assign locations to buildings and keep room-code structure aligned with the campus model.
            </p>
          </div>
          <Button type="button" variant="subtle" size="sm" onClick={onCancel}>Close</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Select
            label="Building"
            value={values.buildingId}
            onChange={(event) => {
              const nextBuilding = buildingOptions.find((building) => building.id === event.target.value) ?? null;
              setValues((current) => ({
                ...current,
                buildingId: event.target.value,
                wing: nextBuilding?.hasWings ? (current.wing === 'NONE' ? '' : current.wing) : 'NONE',
                codeSuffix: normalizeCodeSuffixInput(
                  current.codeSuffix,
                  nextBuilding,
                  nextBuilding?.hasWings ? (current.wing === 'NONE' ? '' : current.wing) : 'NONE',
                  current.floor,
                  current.locationType,
                ),
              }));
            }}
            options={[
              { value: '', label: 'Select building' },
              ...buildingOptions.map((building) => ({
                value: building.id,
                label: formatBuildingOptionLabel(building),
              })),
            ]}
            error={errors.buildingId}
          />
          <Select
            label="Location Type"
            value={values.locationType}
            onChange={(event) => setValues((current) => ({
              ...current,
              locationType: event.target.value as LocationType,
              codeSuffix: normalizeCodeSuffixInput(
                current.codeSuffix,
                selectedBuilding,
                current.wing,
                current.floor,
                event.target.value as LocationType,
              ),
            }))}
            options={locationTypeOptions}
          />
          {shouldShowWing && (
            <Select
              label="Wing"
              value={values.wing}
              onChange={(event) => setValues((current) => ({
                ...current,
                wing: event.target.value as LocationWing | '',
                codeSuffix: normalizeCodeSuffixInput(
                  current.codeSuffix,
                  selectedBuilding,
                  event.target.value as LocationWing | '',
                  current.floor,
                  current.locationType,
                ),
              }))}
              options={[
                { value: '', label: 'Select wing' },
                ...wingOptions,
              ]}
              error={errors.wing}
            />
          )}
          <Input
            label="Floor"
            value={values.floor}
            onChange={(event) => setValues((current) => ({
              ...current,
              floor: event.target.value.replace(/[^\d]/g, ''),
            }))}
            onBlur={() => setValues((current) => ({ ...current, floor: normalizeFloorValue(current.floor) }))}
            placeholder="1"
            error={errors.floor}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Code Suffix / Room Number"
            value={values.codeSuffix}
            onChange={(event) => setValues((current) => ({
              ...current,
              codeSuffix: normalizeCodeSuffixInput(
                event.target.value,
                selectedBuilding,
                current.wing,
                current.floor,
                current.locationType,
              ),
            }))}
            placeholder={selectedBuilding?.hasWings ? 'e.g. 02' : 'e.g. 01'}
            error={errors.codeSuffix}
            hint="Enter only the room-number or suffix portion. The final code is derived automatically."
          />
          <Input
            label="Final Location Code"
            value={finalLocationCode ?? ''}
            readOnly
            disabled
            hint="This is the final code that will be saved."
          />
          <Input
            label="Location Name"
            value={values.locationName}
            onChange={(event) => setValues((current) => ({ ...current, locationName: event.target.value }))}
            error={errors.locationName}
            required
          />
        </div>

        <Alert variant="info" title="Code guidance">
          {getLocationCodeGuidance(selectedBuilding, values.wing, normalizedFloor, values.locationType)}
        </Alert>

        <Textarea
          label="Description"
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          rows={4}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="subtle" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="glass" loading={submitting}>
            {location ? 'Update Location' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
