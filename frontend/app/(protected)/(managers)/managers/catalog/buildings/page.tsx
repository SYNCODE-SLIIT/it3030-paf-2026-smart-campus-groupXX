import { CatalogueBuildingsScreen } from '@/components/screens/catalogue/CatalogueBuildingsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function CatalogueManagerBuildingsPage() {
  await requireManagerRole(['CATALOG_MANAGER']);

  return <CatalogueBuildingsScreen />;
}
