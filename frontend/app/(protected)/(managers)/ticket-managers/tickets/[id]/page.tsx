import { ManagerTicketDetailScreen } from '@/components/screens/ManagerTicketDetailScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagerRole(['TICKET_MANAGER']);
  const { id } = await params;
  return <ManagerTicketDetailScreen ticketRef={id} />;
}
