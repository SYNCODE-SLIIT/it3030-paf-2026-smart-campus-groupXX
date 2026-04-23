'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Navbar, type NavItem } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserHomePath } from '@/lib/auth-routing';
import { triggerRouteProgress } from '@/lib/route-progress';
import { getUserDisplayName, getUserInitials } from '@/lib/user-display';

function navigateWithProgress(router: ReturnType<typeof useRouter>, href: string) {
  triggerRouteProgress();
  router.push(href);
}

export function MarketingNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut } = useAuth();

  const items = React.useMemo<NavItem[]>(() => {
    const baseItems: NavItem[] = [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Features', href: '/features' },
      { label: 'Resources', href: '/resources' },
      { label: 'Contact', href: '/contact' },
    ];

    if (!appUser) {
      return baseItems;
    }

    if (appUser.userType === 'STUDENT') {
      return baseItems;
    }

    return [
      ...baseItems,
      {
        label: 'Portal',
        href: getUserHomePath(appUser),
      },
    ];
  }, [appUser]);

  return (
    <Navbar
      items={items}
      currentPath={pathname}
      user={
        appUser
          ? {
              name: getUserDisplayName(appUser),
              initials: getUserInitials(appUser),
            }
          : null
      }
      onLogin={() => navigateWithProgress(router, '/login')}
      onLogout={() => {
        void signOut().then(() => navigateWithProgress(router, '/login?reason=signed_out'));
      }}
      onNavigate={(href) => navigateWithProgress(router, href)}
      hideAuthActions={pathname === '/login'}
    />
  );
}
