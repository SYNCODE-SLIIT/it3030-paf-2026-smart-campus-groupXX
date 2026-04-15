import type { ResourceCategory, ResourceResponse, ResourceStatus, UserResponse } from '@/lib/api-types';

export const resourceCategoryOptions: Array<{ value: ResourceCategory; label: string }> = [
  { value: 'SPACE', label: 'Spaces' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'EVENT', label: 'Event' },
  { value: 'UTILITY', label: 'Utilities' },
];

export const resourceStatusOptions: Array<{ value: ResourceStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
];

export function getResourceCategoryLabel(category: ResourceCategory) {
  switch (category) {
    case 'SPACE':
      return 'Spaces';
    case 'EQUIPMENT':
      return 'Equipment';
    case 'SPORTS':
      return 'Sports';
    case 'EVENT':
      return 'Event';
    case 'UTILITY':
      return 'Utilities';
  }
}

export function getResourceCategoryChipColor(category: ResourceCategory) {
  switch (category) {
    case 'SPACE':
      return 'blue' as const;
    case 'EQUIPMENT':
      return 'yellow' as const;
    case 'SPORTS':
      return 'green' as const;
    case 'EVENT':
      return 'orange' as const;
    case 'UTILITY':
      return 'neutral' as const;
  }
}

export function getResourceStatusLabel(status: ResourceStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    case 'OUT_OF_SERVICE':
      return 'Out of Service';
  }
}

export function getResourceStatusChipColor(status: ResourceStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'green' as const;
    case 'INACTIVE':
      return 'neutral' as const;
    case 'OUT_OF_SERVICE':
      return 'orange' as const;
  }
}

export function canManageResourceCatalogue(user: Pick<UserResponse, 'userType' | 'managerRoles'> | null | undefined) {
  if (!user) {
    return false;
  }

  return user.userType === 'ADMIN' || (user.userType === 'MANAGER' && user.managerRoles.includes('CATALOG_MANAGER'));
}

export function formatResourceCapacity(resource: Pick<ResourceResponse, 'capacity' | 'quantity'>) {
  if (resource.capacity !== null && resource.capacity !== undefined && resource.quantity !== null && resource.quantity !== undefined) {
    return `${resource.capacity} / ${resource.quantity}`;
  }

  if (resource.capacity !== null && resource.capacity !== undefined) {
    return String(resource.capacity);
  }

  if (resource.quantity !== null && resource.quantity !== undefined) {
    return `${resource.quantity} units`;
  }

  return '-';
}
