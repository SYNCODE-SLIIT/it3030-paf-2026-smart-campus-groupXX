'use client';

import React from 'react';
import { KeyRound, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { Sidebar, type NavSection } from '@/components/layout/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import { GlassPill } from '@/components/ui';
import type { UserResponse } from '@/lib/api-types';
import { getUserDisplayName, getUserInitials, getUserTypeLabel } from '@/lib/user-display';

export function ProtectedShell({
  user,
  children,
}: {
  user: UserResponse;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const sections = React.useMemo<NavSection[]>(() => {
    const portalSections: NavSection[] = [
      {
        title: 'Workspace',
        items: [
          {
            label: 'Portal Overview',
            icon: LayoutDashboard,
            href: '/portal',
          },
          {
            label: 'Account Security',
            icon: KeyRound,
            href: '/account/security',
          },
        ],
      },
    ];

    if (user.userType === 'ADMIN') {
      portalSections.push({
        title: 'Administration',
        items: [
          {
            label: 'User Management',
            icon: ShieldCheck,
            href: '/admin/users',
          },
        ],
      });
    }

    return portalSections;
  }, [user.userType]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 30%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <Sidebar
        sections={sections}
        activePath={pathname}
        brandSubtitle="Identity & Access"
        user={{
          name: getUserDisplayName(user),
          initials: getUserInitials(user),
          role: getUserTypeLabel(user.userType),
        }}
        profileDropdownItems={[
          {
            label: 'Sign out',
            icon: LogOut,
            danger: true,
            onClick: () => {
              void signOut().then(() => router.push('/login?reason=signed_out'));
            },
          },
        ]}
        onNavigate={(item) => {
          if (item.href) {
            router.push(item.href);
          }
        }}
        onLogout={() => {
          void signOut().then(() => router.push('/login?reason=signed_out'));
        }}
      />

      <main
        style={{
          marginLeft: 272,
          padding: '32px 24px 40px',
        }}
      >
        <GlassPill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 16px',
            marginBottom: 20,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-h)',
                letterSpacing: '-0.02em',
              }}
            >
              Smart Campus
            </p>
          </div>
        </GlassPill>

        {children}
      </main>
    </div>
  );
}
