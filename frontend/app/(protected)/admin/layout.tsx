import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();

  return (
    <ProtectedAppFrame allowedUserTypes={['ADMIN']} workspace="admin">
      {children}
    </ProtectedAppFrame>
  );
}
