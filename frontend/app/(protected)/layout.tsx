import { requireProtectedUser } from '@/lib/server-auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProtectedUser();
  return children;
}
