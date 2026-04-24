import { redirect } from 'next/navigation';

import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { LoginScreen } from '@/components/screens/LoginScreen';
import {
  getUserHomePath,
  needsStudentOnboarding,
  sanitizeRedirectPath,
  STUDENT_ONBOARDING_PATH,
} from '@/lib/auth-routing';
import { getServerAuthState } from '@/lib/server-auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, authState] = await Promise.all([searchParams, getServerAuthState()]);
  const rawReason = typeof params.reason === 'string' ? params.reason : null;
  const reason = rawReason === 'auth_required' ? null : rawReason;
  const rawRedirect = typeof params.redirect === 'string' ? params.redirect : null;
  const redirectTo = sanitizeRedirectPath(rawRedirect);

  if (authState.appUser) {
    if (needsStudentOnboarding(authState.appUser)) {
      redirect(STUDENT_ONBOARDING_PATH);
    }

    redirect(redirectTo ?? getUserHomePath(authState.appUser));
  }

  if (rawReason === 'auth_required') {
    redirect(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login');
  }

  return (
    <>
      <MarketingNavbar />
      <LoginScreen reason={reason} redirectTo={redirectTo} />
    </>
  );
}
