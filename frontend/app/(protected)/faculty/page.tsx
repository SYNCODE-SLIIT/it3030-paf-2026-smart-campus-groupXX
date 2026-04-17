import { WorkspacePlaceholderScreen } from '@/components/screens/WorkspacePlaceholderScreen';

export default function FacultyPage() {
  return (
    <WorkspacePlaceholderScreen
      eyebrow="Faculty Workspace"
      title="Faculty Dashboard"
      description="A dedicated dashboard shell for faculty activity and academic operations."
      roleLabel="Faculty"
      chipColor="glass"
      details={[
        { label: 'Access', value: 'Faculty only' },
        { label: 'Layout', value: 'Dedicated' },
      ]}
    />
  );
}
