import { CatalogueManagementDashboardScreen } from '@/components/screens/CatalogueManagementDashboardScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerCataloguePage() {
  await requireManagerRole(['CATALOG_MANAGER']);

  return <CatalogueManagementDashboardScreen workspaceLabel="Manager Workspace" roleLabel="Catalog Manager" />;
}
