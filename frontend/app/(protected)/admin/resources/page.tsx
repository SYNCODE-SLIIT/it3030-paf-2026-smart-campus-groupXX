import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { AdminResourcesScreen } from '@/components/screens/AdminResourcesScreen';

export default function AdminResourcesPage() {
  return (
    <ProtectedAppFrame>
      <AdminResourcesScreen />
    </ProtectedAppFrame>
  );
}
