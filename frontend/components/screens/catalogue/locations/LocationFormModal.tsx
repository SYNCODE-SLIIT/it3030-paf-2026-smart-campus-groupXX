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
  formatBuildingOptionLabel,
  getLocationCodeGuidance,
  locationTypeOptions,
  locationTypeRequiresWing,
  roomCodeRequired,
  wingOptions,
  expectedRoomCodePrefix,
} from '@/lib/location-display';

type LocationFormValues = {
  buildingId: string;
  wing: LocationWing | '';
  floor: string;
  roomCode: string;
  locationName: string;
  locationType: LocationType;
  description: string;
};

type LocationFormErrors = Partial<Record<'buildingId' | 'wing' | 'roomCode' | 'locationName', string>>;

const defaultValues: LocationFormValues = {
  buildingId: '',
  wing: 'NONE',
  floor: '',
  roomCode: '',
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
    floor: location.floor ?? '',
    roomCode: location.roomCode ?? '',
    locationName: location.locationName,
    locationType: location.locationType,
    description: location.description ?? '',
  };
}

export function LocationFormModal({
  title,
  location,
  buildingOptions,
  submitting,
  onSubmit,
  onCancel,
}: {
  title: string;
  location: CatalogueLocationResponse | null;
  buildingOptions: BuildingResponse[];
  submitting: boolean;
  onSubmit: (payload: CreateLocationRequest | UpdateLocationRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<LocationFormValues>(() => valuesFromLocation(location));
  const [errors, setErrors] = React.useState<LocationFormErrors>({});

  React.useEffect(() => {
    setValues(valuesFromLocation(location));
    setErrors({});
  }, [location]);

  const selectedBuilding = React.useMemo(
    () => buildingOptions.find((building) => building.id === values.buildingId) ?? null,
    [buildingOptions, values.buildingId],
  );

  const shouldShowWing = React.useMemo(
    () => Boolean(selectedBuilding?.hasWings),
    [selectedBuilding],
  );

  const wingRequired = React.useMemo(
    () => locationTypeRequiresWing(selectedBuilding, values.locationType),
    [selectedBuilding, values.locationType],
  );

  function validate(next: LocationFormValues) {
    const nextErrors: LocationFormErrors = {};
    const nextBuilding = buildingOptions.find((building) => building.id === next.buildingId) ?? null;

    if (!next.buildingId) nextErrors.buildingId = 'Building is required.';
    if (!next.locationName.trim()) nextErrors.locationName = 'Location name is required.';
    if (locationTypeRequiresWing(nextBuilding, next.locationType) && !next.wing) {
      nextErrors.wing = 'Wing is required for the selected building.';
    }
    if (roomCodeRequired(nextBuilding, next.locationType) && !next.roomCode.trim()) {
      nextErrors.roomCode = 'Room code is required for this building and location type.';
    }

    const prefix = expectedRoomCodePrefix(nextBuilding, next.wing);
    if (prefix && next.roomCode.trim() && !next.roomCode.trim().toUpperCase().startsWith(prefix)) {
      nextErrors.roomCode = `Room code must start with ${prefix}.`;
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateLocationRequest | UpdateLocationRequest = {
      buildingId: values.buildingId,
      wing: selectedBuilding?.hasWings ? (values.wing || null) : 'NONE',
      floor: values.floor.trim() || null,
      roomCode: values.roomCode.trim().toUpperCase() || null,
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
            onChange={(event) => setValues((current) => ({ ...current, locationType: event.target.value as LocationType }))}
            options={locationTypeOptions}
          />
          {shouldShowWing && (
            <Select
              label="Wing"
              value={values.wing}
              onChange={(event) => setValues((current) => ({ ...current, wing: event.target.value as LocationWing | '' }))}
              options={[
                { value: '', label: wingRequired ? 'Select wing' : 'No wing' },
                ...wingOptions,
              ]}
              error={errors.wing}
            />
          )}
          <Input
            label="Floor"
            value={values.floor}
            onChange={(event) => setValues((current) => ({ ...current, floor: event.target.value.toUpperCase() }))}
            placeholder="e.g. 2"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Room Code / Location Code"
            value={values.roomCode}
            onChange={(event) => setValues((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))}
            placeholder="e.g. A201"
            error={errors.roomCode}
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
          {getLocationCodeGuidance(selectedBuilding, values.wing, values.locationType)}
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
