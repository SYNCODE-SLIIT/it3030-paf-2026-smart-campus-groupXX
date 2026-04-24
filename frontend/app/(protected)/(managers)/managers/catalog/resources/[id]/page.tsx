import { ResourceDetailScreen } from '@/components/screens/admin/resources/ResourceDetailScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerCatalogResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManagerRole(['CATALOG_MANAGER']);
  const { id } = await params;

  return (
    <ResourceDetailScreen
      resourceId={id}
      backHref="/managers/catalog"
      backLabel="Back to Catalogue"
    />
  );
}
