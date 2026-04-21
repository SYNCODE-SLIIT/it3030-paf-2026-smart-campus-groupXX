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

const LOCATION_TYPES_REQUIRING_WING = new Set<LocationType>([
  'ROOM',
  'LAB',
  'HALL',
  'LIBRARY_SPACE',
  'EVENT_SPACE',
  'SPORTS_AREA',
  'STORAGE',
  'OTHER',
]);

const LOCATION_TYPES_REQUIRING_ROOM_CODE = new Set<LocationType>([
  'ROOM',
  'LAB',
  'HALL',
  'LIBRARY_SPACE',
  'EVENT_SPACE',
  'STORAGE',
]);

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

export function locationTypeRequiresWing(building: BuildingResponse | null, locationType: LocationType) {
  return Boolean(building?.hasWings) && LOCATION_TYPES_REQUIRING_WING.has(locationType);
}

export function roomCodeRequired(building: BuildingResponse | null, locationType: LocationType) {
  if (!building) return false;
  if (buildingUsesOutdoorRules(building)) return false;
  return LOCATION_TYPES_REQUIRING_ROOM_CODE.has(locationType);
}

export function expectedRoomCodePrefix(building: BuildingResponse | null, wing: LocationWing | '' | null | undefined) {
  if (!building) return null;
  if (building.hasWings) {
    if (wing === 'LEFT_WING') return building.leftWingPrefix ?? null;
    if (wing === 'RIGHT_WING') return building.rightWingPrefix ?? null;
    return null;
  }
  return building.defaultPrefix ?? null;
}

export function getLocationCodeGuidance(building: BuildingResponse | null, wing: LocationWing | '' | null | undefined, locationType: LocationType) {
  if (!building) {
    return 'Select a building to see location-code guidance.';
  }

  if (buildingUsesOutdoorRules(building)) {
    return 'Outdoor Campus locations may omit a room code or use a free-form outdoor label.';
  }

  const prefix = expectedRoomCodePrefix(building, wing);
  if (building.hasWings && locationTypeRequiresWing(building, locationType) && !wing) {
    return 'Choose a wing first so the room-code prefix can be validated.';
  }

  if (prefix) {
    return `Room codes for this selection should start with ${prefix}.`;
  }

  return 'Room code validation will follow the selected building configuration.';
}
