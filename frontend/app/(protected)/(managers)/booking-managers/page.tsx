import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function BookingManagerDashboardPage() {
  await requireManagerRole(['BOOKING_MANAGER']);
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Booking Manager Dashboard"
      description="A focused landing area for booking approvals and resource scheduling."
      roleLabel="Booking Manager"
      chipColor="green"
      details={[
        { label: 'Access', value: 'Role based' },
        { label: 'Requests', value: 'Bookings' },
      ]}
    />
  );
}
