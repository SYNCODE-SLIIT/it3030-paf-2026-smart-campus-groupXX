import { StudentTicketsScreen } from '@/components/screens/StudentTicketsScreen';
import { requireUserType } from '@/lib/server-auth';

export default async function StudentTicketsPage() {
  await requireUserType(['STUDENT']);

  return <StudentTicketsScreen />;
}
