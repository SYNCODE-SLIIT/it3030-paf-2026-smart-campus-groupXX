import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';

export default function StudentsPage() {
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Student Workspace"
      title="Student Dashboard"
      description="A dedicated dashboard shell for student services and academic activity."
      roleLabel="Student"
      chipColor="neutral"
      details={[
        { label: 'Access', value: 'Students only' },
        { label: 'Onboarding', value: 'Complete' },
      ]}
    />
  );
}
