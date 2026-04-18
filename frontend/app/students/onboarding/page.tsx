import { StudentOnboardingFrame } from '@/components/auth/ProtectedRouteFrames';
import { StudentOnboardingScreen } from '@/components/screens/StudentOnboardingScreen';
import { requireStudentOnboardingUser } from '@/lib/server-auth';

export default async function StudentsOnboardingPage() {
  const appUser = await requireStudentOnboardingUser();

  return (
    <StudentOnboardingFrame>
      <StudentOnboardingScreen user={appUser} />
    </StudentOnboardingFrame>
  );
}
