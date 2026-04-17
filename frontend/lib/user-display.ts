import type { AccountStatus, ManagerRole, UserResponse, UserType } from '@/lib/api-types';

function joinNameParts(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' ').trim();
}

export function getUserDisplayName(user: UserResponse) {
  if (user.adminProfile) {
    return user.adminProfile.fullName || user.email;
  }

  const profile = user.studentProfile ?? user.facultyProfile ?? user.managerProfile;
  const preferredName = profile?.preferredName;
  const firstName = profile?.firstName;
  const lastName = profile?.lastName;

  return preferredName || joinNameParts(firstName, lastName) || user.email;
}

export function getUserInitials(user: UserResponse) {
  const displayName = getUserDisplayName(user);
  const parts = displayName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function getUserTypeLabel(userType: UserType) {
  switch (userType) {
    case 'STUDENT':
      return 'Student';
    case 'FACULTY':
      return 'Faculty';
    case 'ADMIN':
      return 'Admin';
    case 'MANAGER':
      return 'Manager';
  }
}

export function getManagerRoleLabel(role: ManagerRole) {
  switch (role) {
    case 'CATALOG_MANAGER':
      return 'Catalog Manager';
    case 'BOOKING_MANAGER':
      return 'Booking Manager';
    case 'TICKET_MANAGER':
      return 'Ticket Manager';
  }
}

export function getManagerRoleInitials(role: ManagerRole | null | undefined) {
  if (!role) {
    return 'MG';
  }

  return getManagerRoleLabel(role)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getUserAvatarInitials(user: UserResponse) {
  if (user.userType === 'MANAGER') {
    return getManagerRoleInitials(user.managerRole);
  }

  return getUserInitials(user);
}

export function getAccountStatusLabel(status: AccountStatus) {
  switch (status) {
    case 'INVITED':
      return 'Invited';
    case 'ACTIVE':
      return 'Active';
    case 'SUSPENDED':
      return 'Suspended';
  }
}

export function getAccountStatusChipColor(status: AccountStatus) {
  switch (status) {
    case 'INVITED':
      return 'orange' as const;
    case 'ACTIVE':
      return 'green' as const;
    case 'SUSPENDED':
      return 'red' as const;
  }
}

export function getUserTypeChipColor(userType: UserType) {
  switch (userType) {
    case 'ADMIN':
      return 'yellow' as const;
    case 'MANAGER':
      return 'blue' as const;
    case 'FACULTY':
      return 'glass' as const;
    case 'STUDENT':
      return 'neutral' as const;
  }
}
