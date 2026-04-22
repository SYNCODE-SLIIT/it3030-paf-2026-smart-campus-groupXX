import { AuditLogScreen } from '@/components/screens/admin/AuditLogScreen';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminAuditLogPage() {
  await requireAdminUser();
  return <AuditLogScreen />;
}
