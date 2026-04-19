import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { requireUserType } from '@/lib/server-auth';

export default async function ManagersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserType(['MANAGER']);

  return (
    <ProtectedAppFrame allowedUserTypes={['MANAGER']} workspace="managers">
      {children}
    </ProtectedAppFrame>
  );
}
