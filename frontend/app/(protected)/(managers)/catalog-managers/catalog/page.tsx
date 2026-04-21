import { AdminResourcesScreen } from '@/components/screens/AdminResourcesScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerCatalogPage() {
  await requireManagerRole(['CATALOG_MANAGER']);
  return <AdminResourcesScreen />;
}
