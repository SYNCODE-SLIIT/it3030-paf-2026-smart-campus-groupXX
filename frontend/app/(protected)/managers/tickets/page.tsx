import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import { requireManagerRole } from '@/lib/server-auth';

export default async function ManagerTicketsPage() {
  await requireManagerRole(['TICKET_MANAGER']);

  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Ticket Management"
      description="Ticket manager tools will live here."
      roleLabel="Ticket Manager"
      chipColor="blue"
      details={[
        { label: 'Manager Role', value: 'Tickets' },
        { label: 'Route', value: '/managers/tickets' },
      ]}
    />
  );
}
