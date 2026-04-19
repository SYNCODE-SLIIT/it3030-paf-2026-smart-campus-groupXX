import { redirect } from 'next/navigation';

import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import { getManagerDashboardPath } from '@/lib/auth-routing';
import { requireUserType } from '@/lib/server-auth';

export default async function ManagersPage() {
  const appUser = await requireUserType(['MANAGER']);
  const dashboardPath = getManagerDashboardPath(appUser.managerRole);

  if (dashboardPath !== '/managers') {
    redirect(dashboardPath);
  }

  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Manager Dashboard"
      description="A manager role has not been assigned to this account yet."
      roleLabel="Manager"
      chipColor="blue"
      details={[
        { label: 'Access', value: 'Pending' },
        { label: 'Modules', value: 'Unavailable' },
      ]}
    />
  );
}
