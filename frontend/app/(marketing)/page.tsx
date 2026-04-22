import { redirect } from 'next/navigation';

import { getUserHomePath, needsStudentOnboarding, STUDENT_ONBOARDING_PATH } from '@/lib/auth-routing';
import { getServerAuthState } from '@/lib/server-auth';

export default async function HomePage() {
  const authState = await getServerAuthState();

  if (authState.appUser) {
    if (needsStudentOnboarding(authState.appUser)) {
      redirect(STUDENT_ONBOARDING_PATH);
    }

    redirect(getUserHomePath(authState.appUser));
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.03em' }}>
        Smart Campus
      </h1>
    </div>
  );
}
