import { RequesterTicketsScreen } from '@/components/screens/StudentTicketsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function CatalogManagerTicketsPage() {
  await requireManagerRole(['CATALOG_MANAGER']);

  return (
    <RequesterTicketsScreen
      workspaceLabel="Manager Workspace"
      description="Submit and track catalogue-related support tickets without leaving the catalogue workspace."
      ticketsBasePath="/managers/catalog/tickets"
      ticketScope="REPORTED"
    />
  );
}
