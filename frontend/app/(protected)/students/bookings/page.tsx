import { RequesterBookingsScreenEnhanced } from '@/components/screens/RequesterBookingsScreenEnhanced';
import { requireUserType } from '@/lib/server-auth';

export default async function StudentBookingsPage() {
  await requireUserType(['STUDENT']);

  return <RequesterBookingsScreenEnhanced workspaceLabel="Student Workspace" />;
}
