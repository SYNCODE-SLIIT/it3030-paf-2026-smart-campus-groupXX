import { AdminContactMessagesScreen } from '@/components/screens/admin/AdminContactMessagesScreen';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminContactUsPage() {
  await requireAdminUser();
  return <AdminContactMessagesScreen />;
}
