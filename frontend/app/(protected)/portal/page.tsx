import { redirect } from 'next/navigation';

import { getUserHomePath } from '@/lib/auth-routing';
import { requireProtectedUser } from '@/lib/server-auth';

export default async function PortalPage() {
  const appUser = await requireProtectedUser();

  redirect(getUserHomePath(appUser));
}
