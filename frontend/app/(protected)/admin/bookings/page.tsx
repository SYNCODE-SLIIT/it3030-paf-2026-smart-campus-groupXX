import { ManagerBookingsScreenEnhanced } from '@/components/screens/ManagerBookingsScreenEnhanced';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminBookingsPage() {
  await requireAdminUser();
  return <ManagerBookingsScreenEnhanced />;
}
