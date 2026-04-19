import { RequesterBookingsScreenEnhanced } from '@/components/screens/RequesterBookingsScreenEnhanced';
import { requireUserType } from '@/lib/server-auth';

export default async function FacultyBookingsPage() {
  await requireUserType(['FACULTY']);

  return <RequesterBookingsScreenEnhanced workspaceLabel="Faculty Workspace" />;
}
