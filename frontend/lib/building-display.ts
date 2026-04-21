import type { BuildingResponse, BuildingType } from '@/lib/api-types';

export const buildingTypeOptions: Array<{ value: BuildingType; label: string }> = [
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'LIBRARY', label: 'Library' },
  { value: 'ADMINISTRATIVE', label: 'Administrative' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'OUTDOOR', label: 'Outdoor' },
  { value: 'OTHER', label: 'Other' },
];

export function getBuildingTypeLabel(buildingType: BuildingType) {
  switch (buildingType) {
    case 'ACADEMIC':
      return 'Academic';
    case 'LIBRARY':
      return 'Library';
    case 'ADMINISTRATIVE':
      return 'Administrative';
    case 'SPORTS':
      return 'Sports';
    case 'OUTDOOR':
      return 'Outdoor';
    case 'OTHER':
      return 'Other';
  }
}

export function getBuildingTypeChipColor(buildingType: BuildingType) {
  switch (buildingType) {
    case 'ACADEMIC':
      return 'blue' as const;
    case 'LIBRARY':
      return 'yellow' as const;
    case 'ADMINISTRATIVE':
      return 'neutral' as const;
    case 'SPORTS':
      return 'green' as const;
    case 'OUTDOOR':
      return 'glass' as const;
    case 'OTHER':
      return 'orange' as const;
  }
}

export function getBuildingLayoutLabel(building: Pick<BuildingResponse, 'hasWings' | 'leftWingPrefix' | 'rightWingPrefix' | 'defaultPrefix'>) {
  if (building.hasWings) {
    const wingLabels = [building.leftWingPrefix, building.rightWingPrefix].filter(Boolean).join(' / ');
    return wingLabels ? `Wings: ${wingLabels}` : 'Wing-based';
  }

  return building.defaultPrefix ? `Prefix: ${building.defaultPrefix}` : 'Single block';
}
