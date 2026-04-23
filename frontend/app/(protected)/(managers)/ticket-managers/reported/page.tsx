import { RequesterTicketsScreen } from '@/components/screens/StudentTicketsScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function TicketManagerReportedTicketsPage() {
  await requireManagerRole(['TICKET_MANAGER']);

  return (
    <RequesterTicketsScreen
      workspaceLabel="Manager Workspace"
      description="Submit and track tickets you have personally reported while keeping the assigned queue separate."
      ticketsBasePath="/ticket-managers/reported"
      ticketScope="REPORTED"
    />
  );
}
