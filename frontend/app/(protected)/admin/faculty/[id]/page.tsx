import { AdminUserDetailScreen } from '@/components/screens/admin/AdminUserDetailScreen';

export default async function AdminFacultyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminUserDetailScreen userId={id} />;
}
