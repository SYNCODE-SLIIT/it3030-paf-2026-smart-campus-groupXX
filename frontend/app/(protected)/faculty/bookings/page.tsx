import { RequesterBookingsScreen } from '@/components/screens/RequesterBookingsScreen';
import { requireUserType } from '@/lib/server-auth';

export default async function FacultyBookingsPage() {
  await requireUserType(['FACULTY']);

  return <RequesterBookingsScreen workspaceLabel="Faculty Workspace" />;
}
