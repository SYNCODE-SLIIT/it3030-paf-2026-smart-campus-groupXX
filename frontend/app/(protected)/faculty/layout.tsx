import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { requireUserType } from '@/lib/server-auth';

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserType(['FACULTY']);

  return (
    <ProtectedAppFrame allowedUserTypes={['FACULTY']} workspace="faculty">
      {children}
    </ProtectedAppFrame>
  );
}
