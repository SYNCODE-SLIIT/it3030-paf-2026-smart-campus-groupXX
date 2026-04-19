import { AdminTicketDetailScreen } from '@/components/screens/admin/AdminTicketDetailScreen';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await params;
  return <AdminTicketDetailScreen ticketRef={id} />;
}
