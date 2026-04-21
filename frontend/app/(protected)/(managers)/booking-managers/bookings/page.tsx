import { ManagerBookingsScreenEnhanced } from '@/components/screens/ManagerBookingsScreenEnhanced';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerBookingsPage() {
  await requireManagerRole(['BOOKING_MANAGER']);
  return <ManagerBookingsScreenEnhanced />;
}
