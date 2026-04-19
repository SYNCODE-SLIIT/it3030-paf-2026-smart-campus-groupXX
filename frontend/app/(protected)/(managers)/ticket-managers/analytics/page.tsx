import { ManagerAnalyticsScreen } from '@/components/screens/manager/ManagerAnalyticsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerAnalyticsPage() {
  await requireManagerRole(['TICKET_MANAGER']);
  return <ManagerAnalyticsScreen />;
}
