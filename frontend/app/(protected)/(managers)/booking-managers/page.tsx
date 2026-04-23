import { BookingManagerDashboardScreen } from '@/components/screens/BookingManagerDashboardScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function BookingManagerDashboardPage() {
  await requireManagerRole(['BOOKING_MANAGER']);
  return <BookingManagerDashboardScreen />;
}
