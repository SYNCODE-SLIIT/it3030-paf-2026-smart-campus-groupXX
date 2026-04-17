import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { requireUserType } from '@/lib/server-auth';

export default async function StudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserType(['STUDENT']);

  return (
    <ProtectedAppFrame allowedUserTypes={['STUDENT']} workspace="students">
      {children}
    </ProtectedAppFrame>
  );
}
