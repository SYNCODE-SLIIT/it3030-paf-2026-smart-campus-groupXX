import { ManagerCompletedScreen } from '@/components/screens/manager/ManagerCompletedScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerCompletedPage() {
  await requireManagerRole(['TICKET_MANAGER']);
  return <ManagerCompletedScreen />;
}
