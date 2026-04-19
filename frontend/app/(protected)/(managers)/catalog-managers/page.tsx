import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function CatalogManagerDashboardPage() {
  await requireManagerRole(['CATALOG_MANAGER']);
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Catalog Manager Dashboard"
      description="A focused landing area for catalogue operations and resource maintenance."
      roleLabel="Catalog Manager"
      chipColor="blue"
      details={[
        { label: 'Access', value: 'Role based' },
        { label: 'Resources', value: 'Catalogue' },
      ]}
    />
  );
}
