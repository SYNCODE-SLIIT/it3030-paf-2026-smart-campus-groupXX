import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { PortalDashboard } from '@/components/screens/PortalDashboard';

export default function PortalPage() {
  return (
    <ProtectedAppFrame>
      <PortalDashboard />
    </ProtectedAppFrame>
  );
}
