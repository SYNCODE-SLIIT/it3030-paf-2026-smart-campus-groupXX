import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';

export default function AdminReportsPage() {
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Insights"
      title="Reports"
      description="A dedicated admin area for generated account, invite, and onboarding reports."
      roleLabel="Admin"
      chipColor="yellow"
      details={[
        { label: 'Status', value: 'Planned' },
        { label: 'Access', value: 'Admins only' },
      ]}
    />
  );
}
