import { StudentOnboardingFrame } from '@/components/auth/ProtectedRouteFrames';
import { StudentOnboardingScreen } from '@/components/screens/StudentOnboardingScreen';

export default function StudentOnboardingPage() {
  return (
    <StudentOnboardingFrame>
      <StudentOnboardingScreen />
    </StudentOnboardingFrame>
  );
}
