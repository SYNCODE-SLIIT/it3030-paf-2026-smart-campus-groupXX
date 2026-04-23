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
  History,
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
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/components/notifications/useNotifications';
import { Sidebar, type NavSection } from '@/components/layout/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import type { UserResponse } from '@/lib/api-types';
import { getManagerDashboardPath } from '@/lib/auth-routing';
import { filterSectionsByRole } from '@/lib/nav-rbac';
import { triggerRouteProgress } from '@/lib/route-progress';
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
          title: 'Users',
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
          ],
        },
        {
          title: 'Manage',
          items: [
            {
              label: 'Catalogue',
              icon: BookOpen,
              href: '/admin/resources',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Buildings',
              icon: BookOpen,
              href: '/admin/buildings',
              allowedUserTypes: ['ADMIN'],
            },
            {
              label: 'Bookings',
              icon: Calendar,
              href: '/admin/bookings',
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
              label: 'Audit Log',
              icon: History,
              href: '/admin/audit-log',
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
              label: 'Catalogue Management',
              icon: BookOpen,
              href: '/managers/catalog',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['CATALOG_MANAGER'],
            },
            {
              label: 'Tickets',
              icon: MessageSquare,
              href: '/managers/catalog/tickets',
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
  const { session, signOut } = useAuth();
  const resolvedWorkspace = workspace === 'auto' ? getWorkspaceForUser(user) : workspace;
  const notificationState = useNotifications(session?.access_token ?? null);
  const refreshNotifications = notificationState.refreshNotifications;

  const navigateTo = React.useCallback((href: string) => {
    triggerRouteProgress();
    router.push(href);
  }, [router]);

  const handleSignOut = React.useCallback(() => {
    void signOut()
      .catch(() => undefined)
      .finally(() => {
        navigateTo('/auth/logout?reason=signed_out');
      });
  }, [navigateTo, signOut]);

  const resolvedSections = React.useMemo<NavSection[]>(() => {
    return filterSectionsByRole(sections ?? getDefaultSections(resolvedWorkspace, user), user);
  }, [resolvedWorkspace, sections, user]);

  const isDashboardRoute = React.useMemo(() => {
    const normalizedPath = pathname.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1)
      : pathname;

    switch (resolvedWorkspace) {
      case 'admin':
        return normalizedPath === '/admin';
      case 'students':
        return normalizedPath === '/students';
      case 'faculty':
        return normalizedPath === '/faculty';
      case 'managers': {
        const managerDashboardPath = getManagerDashboardPath(user.managerRole);
        return normalizedPath === managerDashboardPath;
      }
      default:
        return false;
    }
  }, [pathname, resolvedWorkspace, user.managerRole]);

  React.useEffect(() => {
    if (!isDashboardRoute || !session?.access_token) {
      return undefined;
    }

    const refreshNotificationsInBackground = () => {
      void refreshNotifications('all');
    };

    refreshNotificationsInBackground();

    const interval = window.setInterval(refreshNotificationsInBackground, 45_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshNotificationsInBackground();
      }
    };

    window.addEventListener('focus', refreshNotificationsInBackground);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshNotificationsInBackground);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDashboardRoute, refreshNotifications, session?.access_token]);

  const notificationBell = (
    placement: 'above' | 'below',
    align: 'left' | 'right' = 'right',
    portal = false,
  ) => (
    <NotificationBell
      unreadCount={notificationState.unreadCount}
      notifications={notificationState.notifications}
      loading={notificationState.loading}
      error={notificationState.error}
      placement={placement}
      align={align}
      portal={portal}
      onOpen={() => notificationState.refreshNotifications('all')}
      onMarkAsRead={notificationState.markRead}
      onMarkAllAsRead={notificationState.markAllRead}
      onNavigate={async (notification) => {
        await notificationState.markRead(notification);
        if (notification.actionUrl) {
          navigateTo(notification.actionUrl);
        }
      }}
    />
  );

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
          background: 'var(--bg)',
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
          onNavigate={navigateTo}
          rightAccessory={notificationBell('below')}
        />
        <main style={{ padding: '96px 24px 40px' }}>{children}</main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
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
        notificationCount={notificationState.unreadCount}
        notificationAccessory={notificationBell('above', 'left', true)}
        onNavigate={(item) => {
          if (item.href) {
            navigateTo(item.href);
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
