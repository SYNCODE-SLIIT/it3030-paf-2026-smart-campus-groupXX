import { CatalogueManagerDashboardScreen } from '@/components/screens/CatalogueManagerDashboardScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function CatalogueManagerDashboardPage() {
  await requireManagerRole(['CATALOG_MANAGER']);

  return <CatalogueManagerDashboardScreen workspaceLabel="Manager Workspace" roleLabel="Catalog Manager" />;
}
