import { RequesterTicketDetailScreen } from '@/components/screens/StudentTicketDetailScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function TicketManagerReportedTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagerRole(['TICKET_MANAGER']);
  const { id } = await params;

  return (
    <RequesterTicketDetailScreen
      ticketRef={id}
      ticketsHref="/ticket-managers/reported"
      formIdPrefix="ticket-manager-reported"
    />
  );
}
