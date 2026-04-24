import type { ManagerRole, NextStep, UserResponse } from '@/lib/api-types';

export const STUDENT_ONBOARDING_PATH = '/students/onboarding';

type HomePathUser = Pick<UserResponse, 'userType'> & Partial<Pick<UserResponse, 'managerRole'>>;

export function getManagerDashboardPath(managerRole?: ManagerRole | null) {
  switch (managerRole) {
    case 'CATALOG_MANAGER':
      return '/managers/catalog/dashboard';
    case 'BOOKING_MANAGER':
      return '/booking-managers';
    case 'TICKET_MANAGER':
      return '/ticket-managers';
    default:
      return '/managers';
  }
}

export function getUserHomePath(user: HomePathUser) {
  if (user.userType === 'STUDENT') {
    return '/students';
  }

  if (user.userType === 'ADMIN') {
    return '/admin';
  }

  if (user.userType === 'MANAGER') {
    return getManagerDashboardPath(user.managerRole);
  }

  return '/faculty';
}

export function needsStudentOnboarding(user: Pick<UserResponse, 'userType' | 'studentProfile'>) {
  return user.userType === 'STUDENT' && !user.studentProfile?.onboardingCompleted;
}

export function getPostAuthRedirect(user: UserResponse, nextStep: NextStep) {
  if (nextStep === 'ONBOARDING') {
    return STUDENT_ONBOARDING_PATH;
  }

  return getUserHomePath(user);
}

/**
 * Returns a safe, same-origin path for post-login redirects, or null if the
 * provided value is missing or looks unsafe (e.g. absolute URLs, protocol-relative,
 * or empty). Only paths that start with a single `/` are accepted.
 */
export function sanitizeRedirectPath(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null;
  }

  if (trimmed === '/login' || trimmed.startsWith('/login?')) {
    return null;
  }

  return trimmed;
}

export function buildLoginRedirectHref(redirectTo: string | null | undefined) {
  const safe = sanitizeRedirectPath(redirectTo);
  return safe ? `/login?redirect=${encodeURIComponent(safe)}` : '/login';
}

export function getLoginReasonAlert(reason: string | null) {
  switch (reason) {
    case 'access_denied':
      return {
        variant: 'error' as const,
        title: 'Access denied',
        message: 'This authenticated account is not provisioned for Smart Campus. Please contact an administrator.',
      };
    case 'auth_failed':
      return {
        variant: 'error' as const,
        title: 'Authentication failed',
        message: 'We could not complete the sign-in flow. Please try again.',
      };
    case 'provider_email_missing':
      return {
        variant: 'error' as const,
        title: 'Microsoft account email unavailable',
        message: 'Microsoft did not return an email for this account. Use an account with a mailbox, or ask your admin to enable the email claim in Azure.',
      };
    case 'signed_out':
      return {
        variant: 'info' as const,
        title: 'Signed out',
        message: 'Your session has ended.',
      };
    default:
      return null;
  }
}
