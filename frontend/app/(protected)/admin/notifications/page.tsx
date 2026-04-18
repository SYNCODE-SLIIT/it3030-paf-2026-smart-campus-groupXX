import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';

export default function AdminNotificationsPage() {
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Insights"
      title="Notifications"
      description="A dedicated admin area for reviewing campus notifications and delivery status."
      roleLabel="Admin"
      chipColor="yellow"
      details={[
        { label: 'Status', value: 'Planned' },
        { label: 'Access', value: 'Admins only' },
      ]}
    />
  );
}
