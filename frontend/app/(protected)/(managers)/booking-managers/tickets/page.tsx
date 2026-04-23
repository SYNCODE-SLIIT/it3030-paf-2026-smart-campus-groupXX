import { RequesterTicketsScreen } from '@/components/screens/StudentTicketsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function BookingManagerTicketsPage() {
  await requireManagerRole(['BOOKING_MANAGER']);

  return (
    <RequesterTicketsScreen
      workspaceLabel="Manager Workspace"
      description="Submit and track booking-related support tickets without leaving the booking workspace."
      ticketsBasePath="/booking-managers/tickets"
      ticketScope="REPORTED"
    />
  );
}
