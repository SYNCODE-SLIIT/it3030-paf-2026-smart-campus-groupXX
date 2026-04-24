import { redirect } from 'next/navigation';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerCatalogPage() {
  await requireManagerRole(['CATALOG_MANAGER']);
  redirect('/managers/catalog/dashboard');
}
