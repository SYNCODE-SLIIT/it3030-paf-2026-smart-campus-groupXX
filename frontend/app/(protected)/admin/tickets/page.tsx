import { AdminTicketsScreen } from '@/components/screens/admin/AdminTicketsScreen';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminTicketsPage() {
  await requireAdminUser();
  return <AdminTicketsScreen />;
}
