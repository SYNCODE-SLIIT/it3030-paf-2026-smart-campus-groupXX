import { ResourceDetailScreen } from '@/components/screens/admin/resources/ResourceDetailScreen';
import { requireAdminUser } from '@/lib/server-auth';

export default async function AdminResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { id } = await params;

  return (
    <ResourceDetailScreen
      resourceId={id}
      backHref="/admin/resources"
      backLabel="Back to Catalogue"
    />
  );
}
