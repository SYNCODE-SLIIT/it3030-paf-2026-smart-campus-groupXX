import { notFound } from 'next/navigation';

import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';
import type { ManagerRole } from '@/lib/api-types';
import { requireManagerRole } from '@/lib/server-auth';

const dashboardConfig = {
  catalog: {
    managerRole: 'CATALOG_MANAGER',
    title: 'Catalog Manager Dashboard',
    description: 'A focused landing area for catalogue operations and resource maintenance.',
    roleLabel: 'Catalog Manager',
    chipColor: 'blue',
    moduleLabel: 'Resources',
    moduleValue: 'Catalogue',
  },
  bookings: {
    managerRole: 'BOOKING_MANAGER',
    title: 'Booking Manager Dashboard',
    description: 'A focused landing area for booking approvals and resource scheduling.',
    roleLabel: 'Booking Manager',
    chipColor: 'green',
    moduleLabel: 'Requests',
    moduleValue: 'Bookings',
  },
  tickets: {
    managerRole: 'TICKET_MANAGER',
    title: 'Ticket Manager Dashboard',
    description: 'A focused landing area for assigned support tickets and service follow-up.',
    roleLabel: 'Ticket Manager',
    chipColor: 'yellow',
    moduleLabel: 'Queue',
    moduleValue: 'Tickets',
  },
} satisfies Record<string, {
  managerRole: ManagerRole;
  title: string;
  description: string;
  roleLabel: string;
  chipColor: 'yellow' | 'red' | 'green' | 'blue' | 'orange' | 'neutral' | 'glass';
  moduleLabel: string;
  moduleValue: string;
}>;

export default async function ManagerDashboardPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const config = dashboardConfig[area as keyof typeof dashboardConfig];

  if (!config) {
    notFound();
  }

  await requireManagerRole([config.managerRole]);

  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title={config.title}
      description={config.description}
      roleLabel={config.roleLabel}
      chipColor={config.chipColor}
      details={[
        { label: 'Access', value: 'Role based' },
        { label: config.moduleLabel, value: config.moduleValue },
      ]}
    />
  );
}
