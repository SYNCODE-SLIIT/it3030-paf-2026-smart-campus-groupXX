import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { AccountSecurityScreen } from '@/components/screens/AccountSecurityScreen';

export default function AccountSecurityPage() {
  return (
    <ProtectedAppFrame>
      <AccountSecurityScreen />
    </ProtectedAppFrame>
  );
}
