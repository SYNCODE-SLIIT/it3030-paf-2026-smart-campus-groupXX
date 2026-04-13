import type { NextStep, UserResponse } from '@/lib/api-types';

export function getUserHomePath(user: Pick<UserResponse, 'userType'>) {
  return user.userType === 'ADMIN' ? '/admin' : '/portal';
}

export function needsStudentOnboarding(user: Pick<UserResponse, 'userType' | 'studentProfile'>) {
  return user.userType === 'STUDENT' && !user.studentProfile?.onboardingCompleted;
}

export function getPostAuthRedirect(user: UserResponse, nextStep: NextStep) {
  if (nextStep === 'ONBOARDING') {
    return '/student/onboarding';
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
    case 'auth_required':
      return {
        variant: 'warning' as const,
        title: 'Sign in required',
        message: 'Please authenticate to continue.',
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
