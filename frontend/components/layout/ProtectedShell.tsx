'use client';

import React from 'react';
import {
  BarChart2,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { Navbar, type NavItem } from '@/components/layout/Navbar';
import { Sidebar, type NavSection } from '@/components/layout/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import type { UserResponse } from '@/lib/api-types';
import { getManagerDashboardPath } from '@/lib/auth-routing';
import { filterSectionsByRole } from '@/lib/nav-rbac';
import { getUserDisplayName, getUserInitials, getUserTypeLabel } from '@/lib/user-display';
import type { WorkspaceKind } from '@/lib/workspace';

function getWorkspaceForUser(user: UserResponse): Exclude<WorkspaceKind, 'auto'> {
  switch (user.userType) {
    case 'ADMIN':
      return 'admin';
    case 'MANAGER':
      return 'managers';
    case 'STUDENT':
      return 'students';
    case 'FACULTY':
      return 'faculty';
  }
}

function getBrandSubtitle(workspace: Exclude<WorkspaceKind, 'auto'>) {
  switch (workspace) {
    case 'admin':
      return 'Admin Console';
    case 'managers':
      return 'Manager Workspace';
    case 'students':
      return 'Student Workspace';
    case 'faculty':
      return 'Faculty Workspace';
  }
}

function getDefaultSections(workspace: Exclude<WorkspaceKind, 'auto'>, user?: UserResponse): NavSection[] {
  switch (workspace) {
    case 'admin':
      return [
        {
          title: 'Console',
          items: [
            {
              label: 'Dashboard',
              icon: LayoutDashboard,
              href: '/admin',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'User Management',
              icon: ShieldCheck,
              href: '/admin/users',
              allowedUserTypes: ['ADMIN'],
            },
          ],
        },
        {
          title: 'Manage',
          items: [
            {
              label: 'Students',
              icon: GraduationCap,
              href: '/admin/students',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Faculty',
              icon: BookOpen,
              href: '/admin/faculty',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Managers',
              icon: Users,
              href: '/admin/managers',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Admins',
              icon: ShieldCheck,
              href: '/admin/admins',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Tickets',
              icon: Ticket,
              href: '/admin/tickets',
              allowedUserTypes: ['ADMIN'],
            },
          ],
        },
        {
          title: 'Insights',
          items: [
            {
              label: 'Analytics',
              icon: BarChart2,
              href: '/admin/analytics',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Notifications',
              icon: Bell,
              href: '/admin/notifications',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Reports',
              icon: FileText,
              href: '/admin/reports',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Account Security',
              icon: KeyRound,
              href: '/account/security',
              allowedUserTypes: ['ADMIN'],
            },
          ],
        },
      ];
    case 'managers':
      return [
        {
          title: 'Management',
          items: [
            {
              label: 'Dashboard',
              icon: LayoutDashboard,
              href: getManagerDashboardPath(user?.managerRole),
              allowedUserTypes: ['MANAGER'],
            },
            {
              label: 'Catalog',
              icon: BookOpen,
              href: '/catalog-managers/catalog',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['CATALOG_MANAGER'],
            },
            {
              label: 'Bookings',
              icon: Calendar,
              href: '/booking-managers/bookings',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['BOOKING_MANAGER'],
            },
            {
              label: 'My Tickets',
              icon: MessageSquare,
              href: '/ticket-managers/tickets',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['TICKET_MANAGER'],
            },
            {
              label: 'Completed',
              icon: CheckCircle2,
              href: '/ticket-managers/completed',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['TICKET_MANAGER'],
            },
            {
              label: 'Analytics',
              icon: BarChart2,
              href: '/ticket-managers/analytics',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['TICKET_MANAGER'],
            },
            {
              label: 'Account Security',
              icon: KeyRound,
              href: '/account/security',
              allowedUserTypes: ['MANAGER'],
            },
          ],
        },
      ];
    case 'students':
      return [
        {
          title: 'Student',
          items: [
            {
              label: 'Dashboard',
              icon: LayoutDashboard,
              href: '/students',
              allowedUserTypes: ['STUDENT'],
            },
            {
              label: 'Bookings',
              icon: Calendar,
              href: '/students/bookings',
              allowedUserTypes: ['STUDENT'],
            },
            {
              label: 'Tickets',
              icon: MessageSquare,
              href: '/students/tickets',
              allowedUserTypes: ['STUDENT'],
            },
            {
              label: 'Account Security',
              icon: KeyRound,
              href: '/account/security',
              allowedUserTypes: ['STUDENT'],
            },
          ],
        },
      ];
    case 'faculty':
      return [
        {
          title: 'Faculty',
          items: [
            {
              label: 'Dashboard',
              icon: LayoutDashboard,
              href: '/faculty',
              allowedUserTypes: ['FACULTY'],
            },
            {
              label: 'Bookings',
              icon: Calendar,
              href: '/faculty/bookings',
              allowedUserTypes: ['FACULTY'],
            },
            {
              label: 'Account Security',
              icon: KeyRound,
              href: '/account/security',
              allowedUserTypes: ['FACULTY'],
            },
          ],
        },
      ];
  }
}

export function ProtectedShell({
  user,
  children,
  workspace = 'auto',
  sections,
  brandSubtitle,
  userDisplay,
}: {
  user: UserResponse;
  children: React.ReactNode;
  workspace?: WorkspaceKind;
  sections?: NavSection[];
  brandSubtitle?: string;
  userDisplay?: { name?: string; role?: string; initials?: string; src?: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const resolvedWorkspace = workspace === 'auto' ? getWorkspaceForUser(user) : workspace;

  const handleSignOut = React.useCallback(() => {
    void signOut()
      .catch(() => undefined)
      .finally(() => {
        router.push('/auth/logout?reason=signed_out');
      });
  }, [router, signOut]);

  const resolvedSections = React.useMemo<NavSection[]>(() => {
    return filterSectionsByRole(sections ?? getDefaultSections(resolvedWorkspace, user), user);
  }, [resolvedWorkspace, sections, user]);

  if (resolvedWorkspace === 'students') {
    const navItems: NavItem[] = resolvedSections.flatMap((s) =>
      s.items.map((item) => ({
        label: item.label,
        href: item.href ?? '',
        allowedUserTypes: item.allowedUserTypes,
      })),
    );

    return (
      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 30%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
        }}
      >
        <Navbar
          items={navItems}
          currentPath={pathname}
          user={{
            name: userDisplay?.name ?? getUserDisplayName(user),
            initials: userDisplay?.initials ?? getUserInitials(user),
            src: userDisplay?.src,
          }}
          onLogout={handleSignOut}
          onNavigate={(href) => router.push(href)}
        />
        <main style={{ padding: '96px 24px 40px' }}>{children}</main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 30%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <Sidebar
        sections={resolvedSections}
        activePath={pathname}
        brandSubtitle={brandSubtitle ?? getBrandSubtitle(resolvedWorkspace)}
        user={{
          name: userDisplay?.name ?? getUserDisplayName(user),
          initials: userDisplay?.initials ?? getUserInitials(user),
          role: userDisplay?.role ?? getUserTypeLabel(user.userType),
          src: userDisplay?.src,
        }}
        profileDropdownItems={[
          {
            label: 'Sign out',
            icon: LogOut,
            danger: true,
            onClick: handleSignOut,
          },
        ]}
        onNavigate={(item) => {
          if (item.href) {
            router.push(item.href);
          }
        }}
        onLogout={handleSignOut}
      />

      <main
        style={{
          marginLeft: 272,
          padding: '32px 24px 40px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
