'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Navbar, type NavItem } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserHomePath } from '@/lib/auth-routing';
import { getUserDisplayName, getUserInitials } from '@/lib/user-display';

export function MarketingNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut } = useAuth();

  const items = React.useMemo<NavItem[]>(() => {
    const baseItems: NavItem[] = [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Components', href: '/components' },
    ];

    if (!appUser) {
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
      onLogin={() => router.push('/login')}
      onLogout={() => {
        void signOut().then(() => router.push('/login?reason=signed_out'));
      }}
      onNavigate={(href) => router.push(href)}
    />
  );
}
