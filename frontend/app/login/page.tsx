import { redirect } from 'next/navigation';

import { LoginScreen } from '@/components/screens/LoginScreen';
import { getUserHomePath, needsStudentOnboarding } from '@/lib/auth-routing';
import { getServerAuthState } from '@/lib/server-auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, authState] = await Promise.all([searchParams, getServerAuthState()]);
  const reason = typeof params.reason === 'string' ? params.reason : null;

  if (authState.appUser) {
    if (needsStudentOnboarding(authState.appUser)) {
      redirect('/student/onboarding');
    }

    redirect(getUserHomePath(authState.appUser));
  }

  return <LoginScreen reason={reason} />;
}
