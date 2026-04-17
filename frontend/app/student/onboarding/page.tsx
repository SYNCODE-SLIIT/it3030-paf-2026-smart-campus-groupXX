import { redirect } from 'next/navigation';

import { STUDENT_ONBOARDING_PATH } from '@/lib/auth-routing';

export default async function StudentOnboardingPage() {
  redirect(STUDENT_ONBOARDING_PATH);
}
