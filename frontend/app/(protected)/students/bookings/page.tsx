import { RequesterBookingsScreen } from '@/components/screens/RequesterBookingsScreen';
import { requireUserType } from '@/lib/server-auth';

export default async function StudentBookingsPage() {
  await requireUserType(['STUDENT']);

  return <RequesterBookingsScreen workspaceLabel="Student Workspace" />;
}
