import { redirect } from 'next/navigation';

import { ProtectedAppFrame } from '@/components/auth/ProtectedRouteFrames';
import { QuickBookingScreen } from '@/components/screens/QuickBookingScreen';
import {
  buildLoginRedirectHref,
  getUserHomePath,
  needsStudentOnboarding,
  STUDENT_ONBOARDING_PATH,
} from '@/lib/auth-routing';
import { getServerAuthState } from '@/lib/server-auth';

export default async function QuickBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookingPath = `/book/resource/${id}`;
  const authState = await getServerAuthState();

  if (!authState.isAuthenticated) {
    redirect(buildLoginRedirectHref(bookingPath));
  }

  if (!authState.appUser) {
    redirect('/auth/logout?reason=access_denied');
  }

  if (needsStudentOnboarding(authState.appUser)) {
    redirect(STUDENT_ONBOARDING_PATH);
  }

  // Only STUDENT and FACULTY user types can create bookings via this flow.
  if (authState.appUser.userType !== 'STUDENT' && authState.appUser.userType !== 'FACULTY') {
    redirect(getUserHomePath(authState.appUser));
  }

  const workspace = authState.appUser.userType === 'FACULTY' ? 'faculty' : 'students';

  return (
    <ProtectedAppFrame allowedUserTypes={['STUDENT', 'FACULTY']} workspace={workspace}>
      <QuickBookingScreen resourceId={id} />
    </ProtectedAppFrame>
  );
}
