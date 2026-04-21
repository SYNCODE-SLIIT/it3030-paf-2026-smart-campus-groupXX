import { RequesterTicketDetailScreen } from '@/components/screens/StudentTicketDetailScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function CatalogManagerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagerRole(['CATALOG_MANAGER']);
  const { id } = await params;

  return (
    <RequesterTicketDetailScreen
      ticketRef={id}
      ticketsHref="/managers/catalog/tickets"
      formIdPrefix="catalog-manager"
    />
  );
}
