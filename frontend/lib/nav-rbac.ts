import type { ManagerRole, UserResponse, UserType } from '@/lib/api-types';

export type AccessUser =
  | Pick<UserResponse, 'userType' | 'managerRoles'>
  | null
  | undefined;

export interface AccessControlledItem {
  allowedUserTypes?: UserType[];
  allowedManagerRoles?: ManagerRole[];
}

function managerRoleAllowed(item: AccessControlledItem, user: AccessUser) {
  if (!item.allowedManagerRoles?.length) {
    return true;
  }

  if (!user || user.userType !== 'MANAGER') {
    return false;
  }

  return item.allowedManagerRoles.some((role) => user.managerRoles.includes(role));
}

export function canAccessItem(item: AccessControlledItem, user: AccessUser) {
  const userTypeAllowed = !item.allowedUserTypes?.length || (user ? item.allowedUserTypes.includes(user.userType) : false);
  return userTypeAllowed && managerRoleAllowed(item, user);
}

export function filterNavByRole<T extends AccessControlledItem>(items: T[], user: AccessUser): T[] {
  return items.filter((item) => canAccessItem(item, user));
}

export function filterSectionsByRole<
  TItem extends AccessControlledItem,
  TSection extends { items: TItem[] },
>(sections: TSection[], user: AccessUser): TSection[] {
  return sections
    .map((section) => ({ ...section, items: filterNavByRole(section.items, user) }))
    .filter((section) => section.items.length > 0);
}
