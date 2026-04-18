import type { ResourceCategory, ResourceResponse, ResourceStatus } from '@/lib/api-types';

export const resourceCategoryOptions: Array<{ value: ResourceCategory; label: string }> = [
  { value: 'SPACES', label: 'Spaces' },
  { value: 'TECHNICAL_EQUIPMENT', label: 'Technical Equipment' },
  { value: 'MAINTENANCE_AND_CLEANING', label: 'Maintenance & Cleaning' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'EVENT_AND_DECORATION', label: 'Event & Decoration' },
  { value: 'GENERAL_UTILITY', label: 'General Utility' },
  { value: 'TRANSPORT_AND_LOGISTICS', label: 'Transport & Logistics' },
];

export const resourceStatusOptions: Array<{ value: ResourceStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export function getResourceCategoryLabel(category: ResourceCategory) {
  switch (category) {
    case 'SPACES':
      return 'Spaces';
    case 'TECHNICAL_EQUIPMENT':
      return 'Technical Equipment';
    case 'MAINTENANCE_AND_CLEANING':
      return 'Maintenance & Cleaning';
    case 'SPORTS':
      return 'Sports';
    case 'EVENT_AND_DECORATION':
      return 'Event & Decoration';
    case 'GENERAL_UTILITY':
      return 'General Utility';
    case 'TRANSPORT_AND_LOGISTICS':
      return 'Transport & Logistics';
  }
}

export function getResourceCategoryChipColor(category: ResourceCategory) {
  switch (category) {
    case 'SPACES':
      return 'blue' as const;
    case 'TECHNICAL_EQUIPMENT':
      return 'yellow' as const;
    case 'MAINTENANCE_AND_CLEANING':
      return 'orange' as const;
    case 'SPORTS':
      return 'green' as const;
    case 'EVENT_AND_DECORATION':
      return 'red' as const;
    case 'GENERAL_UTILITY':
      return 'neutral' as const;
    case 'TRANSPORT_AND_LOGISTICS':
      return 'glass' as const;
  }
}

export function getResourceStatusLabel(status: ResourceStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'OUT_OF_SERVICE':
      return 'Out of Service';
    case 'MAINTENANCE':
      return 'Maintenance';
    case 'INACTIVE':
      return 'Inactive';
  }
}

export function getResourceStatusChipColor(status: ResourceStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'green' as const;
    case 'OUT_OF_SERVICE':
      return 'red' as const;
    case 'MAINTENANCE':
      return 'orange' as const;
    case 'INACTIVE':
      return 'neutral' as const;
  }
}

export function resourceAvailabilityLabel(resource: Pick<ResourceResponse, 'availableFrom' | 'availableTo'>) {
  if (!resource.availableFrom && !resource.availableTo) {
    return 'Any time';
  }

  return `${resource.availableFrom ?? '—'} to ${resource.availableTo ?? '—'}`;
}