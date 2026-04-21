import { StudentTicketDetailScreen } from '@/components/screens/StudentTicketDetailScreen';
import { requireUserType } from '@/lib/server-auth';

export default async function StudentTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserType(['STUDENT']);
  const { id } = await params;

  return <StudentTicketDetailScreen ticketRef={id} />;
}
