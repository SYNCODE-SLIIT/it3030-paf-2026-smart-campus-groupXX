import type { NextStep, UserResponse } from '@/lib/api-types';

export const STUDENT_ONBOARDING_PATH = '/students/onboarding';

export function getUserHomePath(user: Pick<UserResponse, 'userType'>) {
  if (user.userType === 'STUDENT') {
    return '/students';
  }

  if (user.userType === 'ADMIN') {
    return '/admin';
  }

  if (user.userType === 'MANAGER') {
    return '/managers';
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
