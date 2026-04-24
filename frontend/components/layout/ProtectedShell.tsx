'use client';

import React from 'react';
import {
  ArrowLeft,
  BarChart2,
  Bell,
  BookOpen,
  Building2,
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui';
import { Navbar, type NavItem } from '@/components/layout/Navbar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/components/notifications/useNotifications';
import { Sidebar, type NavSection } from '@/components/layout/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import type { UserResponse } from '@/lib/api-types';
import { getManagerDashboardPath, sanitizeRedirectPath } from '@/lib/auth-routing';
import { filterSectionsByRole } from '@/lib/nav-rbac';
import { triggerRouteProgress } from '@/lib/route-progress';
import { getUserDisplayName, getUserInitials, getUserTypeLabel } from '@/lib/user-display';
import type { WorkspaceKind } from '@/lib/workspace';

/** Shown next to the sidebar on detail routes: prefers browser back when the referrer is same-origin. */
function getWorkspaceBackMetadata(pathname: string): { fallbackHref: string } | null {
  const normalized =
    pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (/^\/managers\/catalog\/resources\/[^/]+$/.test(normalized)) {
    return { fallbackHref: '/managers/catalog' };
  }
  if (/^\/admin\/resources\/[^/]+$/.test(normalized)) {
    return { fallbackHref: '/admin/resources' };
  }
  return null;
}

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
              label: 'Catalogue',
              icon: BookOpen,
              href: '/managers/catalog',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['CATALOG_MANAGER'],
            },
            {
              label: 'Buildings',
              icon: Building2,
              href: '/managers/catalog/buildings',
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
              label: 'Tickets',
              icon: MessageSquare,
              href: '/booking-managers/tickets',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['BOOKING_MANAGER'],
            },
            {
              label: 'Assigned Tickets',
              icon: MessageSquare,
              href: '/ticket-managers/tickets',
              allowedUserTypes: ['MANAGER'],
              allowedManagerRoles: ['TICKET_MANAGER'],
            },
            {
              label: 'Reported Tickets',
              icon: MessageSquare,
              href: '/ticket-managers/reported',
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const resolvedWorkspace = workspace === 'auto' ? getWorkspaceForUser(user) : workspace;
  const notificationState = useNotifications(session?.access_token ?? null);
  const refreshNotifications = notificationState.refreshNotifications;

  const navigateTo = React.useCallback((href: string) => {
    triggerRouteProgress();
    router.push(href);
  }, [router]);

  const workspaceBack = React.useMemo(() => getWorkspaceBackMetadata(pathname), [pathname]);

  function handleWorkspaceBack() {
    if (!workspaceBack) {
      return;
    }
    const returnTo = sanitizeRedirectPath(searchParams.get('returnTo'));
    if (returnTo) {
      navigateTo(returnTo);
      return;
    }
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      try {
        const ref = document.referrer;
        if (ref) {
          const refOrigin = new URL(ref).origin;
          if (refOrigin === window.location.origin) {
            router.back();
            return;
          }
        }
      } catch {
        // ignore invalid referrer
      }
    }
    navigateTo(workspaceBack.fallbackHref);
  }

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
        {workspaceBack && (
          <div
            style={{
              margin: '-8px 0 20px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconLeft={<ArrowLeft size={16} strokeWidth={2.2} />}
              onClick={handleWorkspaceBack}
            >
              Back
            </Button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
