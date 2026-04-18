import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';

export default function ManagersPage() {
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Manager Workspace"
      title="Manager Dashboard"
      description="A focused landing area for the signed-in manager role."
      roleLabel="Manager"
      chipColor="blue"
      details={[
        { label: 'Access', value: 'Role based' },
        { label: 'Modules', value: 'Catalog, bookings, tickets' },
      ]}
    />
  );
}
