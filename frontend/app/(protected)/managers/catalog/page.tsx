import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerCatalogPage() {
  await requireManagerRole(['CATALOG_MANAGER']);

  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Catalog Management"
      description="Catalog manager tools will live here."
      roleLabel="Catalog Manager"
      chipColor="blue"
      details={[
        { label: 'Manager Role', value: 'Catalog' },
        { label: 'Route', value: '/managers/catalog' },
      ]}
    />
  );
}
