import type { BuildingResponse, CatalogueLocationResponse, LocationOption, LocationType, LocationWing } from '@/lib/api-types';

export const locationTypeOptions: Array<{ value: LocationType; label: string }> = [
  { value: 'BUILDING', label: 'Building' },
  { value: 'ROOM', label: 'Room' },
  { value: 'LAB', label: 'Lab' },
  { value: 'HALL', label: 'Hall' },
  { value: 'LIBRARY_SPACE', label: 'Library Space' },
  { value: 'EVENT_SPACE', label: 'Event Space' },
  { value: 'SPORTS_AREA', label: 'Sports Area' },
  { value: 'OUTDOOR_AREA', label: 'Outdoor Area' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'OTHER', label: 'Other' },
];

export const wingOptions: Array<{ value: LocationWing; label: string }> = [
  { value: 'LEFT_WING', label: 'Left Wing' },
  { value: 'RIGHT_WING', label: 'Right Wing' },
  { value: 'NONE', label: 'None' },
];

export function getLocationTypeLabel(locationType: LocationType) {
  return locationTypeOptions.find((option) => option.value === locationType)?.label ?? locationType;
}

export function getWingLabel(wing: LocationWing | null | undefined) {
  switch (wing) {
    case 'LEFT_WING':
      return 'Left Wing';
    case 'RIGHT_WING':
      return 'Right Wing';
    case 'NONE':
      return 'None';
    default:
      return '—';
  }
}

export function formatBuildingOptionLabel(building: BuildingResponse) {
  return `${building.buildingName} (${building.buildingCode})`;
}

export function formatCatalogueLocationLabel(location: CatalogueLocationResponse | LocationOption) {
  const details = [
    location.buildingName ? `${location.buildingName}${location.buildingCode ? ` (${location.buildingCode})` : ''}` : null,
    'wing' in location ? (location.wing ? getWingLabel(location.wing) : null) : null,
    location.floor,
    location.roomCode,
    getLocationTypeLabel(location.locationType),
  ].filter(Boolean);

  return details.length > 0
    ? `${location.locationName} · ${details.join(' · ')}`
    : location.locationName;
}

export function buildingUsesOutdoorRules(building: BuildingResponse | null) {
  return building?.buildingType === 'OUTDOOR' || building?.buildingCode === 'OUTDOOR';
}

export function normalizeFloorValue(floor: string | null | undefined) {
  const trimmed = floor?.trim();
  return trimmed ? trimmed : '1';
}

export function locationTypeRequiresWing(building: BuildingResponse | null) {
  return Boolean(building?.hasWings);
}

export function resolveLocationCodePrefix(
  building: BuildingResponse | null,
  wing: LocationWing | '' | null | undefined,
  locationType?: LocationType,
) {
  if (!building) return null;
  if (building.hasWings) {
    if (wing === 'LEFT_WING') return building.leftWingPrefix ?? null;
    if (wing === 'RIGHT_WING') return building.rightWingPrefix ?? null;
    return null;
  }

  if (building.defaultPrefix) {
    return building.defaultPrefix;
  }

  if (locationType === 'OUTDOOR_AREA' || buildingUsesOutdoorRules(building)) {
    return building.buildingCode;
  }

  return building.buildingCode ?? null;
}

export function normalizeCodeSuffixInput(
  rawValue: string,
  building: BuildingResponse | null,
  wing: LocationWing | '' | null | undefined,
  floor: string | null | undefined,
  locationType: LocationType,
) {
  const prefix = resolveLocationCodePrefix(building, wing, locationType);
  const normalized = rawValue.trim().toUpperCase();
  if (!normalized || !prefix) {
    return normalized;
  }

  const normalizedFloor = normalizeFloorValue(floor);
  if (buildingUsesOutdoorRules(building) || locationType === 'OUTDOOR_AREA') {
    if (normalized.startsWith(`${prefix}-`)) {
      return normalized.slice(prefix.length + 1);
    }
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length).replace(/^-/, '');
    }
    return normalized;
  }

  const requiredStart = `${prefix}${normalizedFloor}`;
  if (normalized.startsWith(requiredStart)) {
    return normalized.slice(requiredStart.length);
  }
  return normalized;
}

export function buildLocationCode(
  building: BuildingResponse | null,
  wing: LocationWing | '' | null | undefined,
  floor: string | null | undefined,
  codeSuffix: string | null | undefined,
  locationType: LocationType,
) {
  const prefix = resolveLocationCodePrefix(building, wing, locationType);
  const suffix = (codeSuffix ?? '').trim().toUpperCase();
  if (!prefix) return null;
  if (!suffix) return buildingUsesOutdoorRules(building) || locationType === 'OUTDOOR_AREA'
    ? `${prefix}-`
    : `${prefix}${normalizeFloorValue(floor)}`;

  if (buildingUsesOutdoorRules(building) || locationType === 'OUTDOOR_AREA') {
    return `${prefix}-${suffix.replace(/^-+/, '')}`;
  }

  return `${prefix}${normalizeFloorValue(floor)}${suffix}`;
}

export function extractCodeSuffixFromStoredCode(
  building: BuildingResponse | null,
  wing: LocationWing | '' | null | undefined,
  floor: string | null | undefined,
  roomCode: string | null | undefined,
  locationType: LocationType,
) {
  if (!roomCode) {
    return '';
  }

  return normalizeCodeSuffixInput(roomCode, building, wing, floor, locationType);
}

export function getLocationCodeGuidance(
  building: BuildingResponse | null,
  wing: LocationWing | '' | null | undefined,
  floor: string | null | undefined,
  locationType: LocationType,
) {
  if (!building) {
    return 'Select a building to see location-code guidance.';
  }

  if (buildingUsesOutdoorRules(building)) {
    const prefix = resolveLocationCodePrefix(building, wing, locationType) ?? building.buildingCode;
    return `Outdoor spaces use flexible codes. Recommended format: ${prefix}-BIRDNEST or ${prefix}-COURT1.`;
  }

  const prefix = resolveLocationCodePrefix(building, wing, locationType);
  const normalizedFloor = normalizeFloorValue(floor);
  if (building.hasWings && !wing) {
    return 'Choose a wing first so the location-code prefix can be derived.';
  }

  if (prefix) {
    return `Final code will use ${prefix}${normalizedFloor} as the base. Example: ${prefix}${normalizedFloor}02.`;
  }

  return 'Location code validation will follow the selected building configuration.';
}
