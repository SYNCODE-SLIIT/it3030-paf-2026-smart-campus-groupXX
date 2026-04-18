import { ManagerTicketsScreen } from '@/components/screens/ManagerTicketsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerTicketsPage() {
  await requireManagerRole(['TICKET_MANAGER']);
  return <ManagerTicketsScreen />;
}
