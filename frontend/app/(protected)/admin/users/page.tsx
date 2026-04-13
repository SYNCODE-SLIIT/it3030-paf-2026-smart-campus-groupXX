import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { AdminUsersScreen } from '@/components/screens/AdminUsersScreen';

export default function AdminUsersPage() {
  return (
    <ProtectedAppFrame requireAdmin>
      <AdminUsersScreen />
    </ProtectedAppFrame>
  );
}
