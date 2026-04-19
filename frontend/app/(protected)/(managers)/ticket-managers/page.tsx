import { ManagerDashboardScreen } from '@/components/screens/manager/ManagerDashboardScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function TicketManagerDashboardPage() {
  await requireManagerRole(['TICKET_MANAGER']);
  return <ManagerDashboardScreen />;
}
