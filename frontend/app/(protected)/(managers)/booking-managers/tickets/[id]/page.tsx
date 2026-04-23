import { RequesterTicketDetailScreen } from '@/components/screens/StudentTicketDetailScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function BookingManagerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagerRole(['BOOKING_MANAGER']);
  const { id } = await params;

  return (
    <RequesterTicketDetailScreen
      ticketRef={id}
      ticketsHref="/booking-managers/tickets"
      formIdPrefix="booking-manager"
    />
  );
}
