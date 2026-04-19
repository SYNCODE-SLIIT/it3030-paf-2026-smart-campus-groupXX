import { ManagerBookingsScreen } from '@/components/screens/ManagerBookingsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerBookingsPage() {
  await requireManagerRole(['BOOKING_MANAGER']);
  return <ManagerBookingsScreen />;
}
