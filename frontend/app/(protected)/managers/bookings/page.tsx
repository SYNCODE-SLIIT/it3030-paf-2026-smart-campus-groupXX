import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerBookingsPage() {
  await requireManagerRole(['BOOKING_MANAGER']);

  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Booking Management"
      description="Booking manager tools will live here."
      roleLabel="Booking Manager"
      chipColor="blue"
      details={[
        { label: 'Manager Role', value: 'Bookings' },
        { label: 'Route', value: '/managers/bookings' },
      ]}
    />
  );
}
