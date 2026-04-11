export type UserRole = 'student' | 'lecturer' | 'admin' | 'guest';

/**
 * Filter a flat nav item array by role.
 * Items without allowedRoles are always visible (open default).
 */
export function filterNavByRole<T extends { allowedRoles?: UserRole[] }>(
  items: T[],
  role: UserRole | undefined
): T[] {
  return items.filter(
    (item) => !item.allowedRoles || (role !== undefined && item.allowedRoles.includes(role))
  );
}

/**
 * Filter NavSection[] by role.
 * Sections that become empty after filtering are dropped entirely.
 */
export function filterSectionsByRole<
  TItem extends { allowedRoles?: UserRole[] },
  TSection extends { items: TItem[] }
>(sections: TSection[], role: UserRole | undefined): TSection[] {
  return sections
    .map((section) => ({ ...section, items: filterNavByRole(section.items, role) }))
    .filter((section) => section.items.length > 0);
}
