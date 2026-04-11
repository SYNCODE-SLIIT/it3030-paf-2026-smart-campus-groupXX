'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import type { NavItem } from '@/components/layout/Navbar';
import { filterNavByRole } from '@/lib/nav-rbac';
import type { UserRole } from '@/lib/nav-rbac';

// Replace with your auth context/session value when auth is wired up.
// undefined = unauthenticated; role-gated items will be hidden.
const currentRole: UserRole | undefined = undefined;

const navItems: NavItem[] = [
  { label: 'Home',       href: '/' },
  { label: 'About',      href: '/about' },
  { label: 'Contact',    href: '/contact' },
  { label: 'Components', href: '/components' },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const visibleItems = filterNavByRole(navItems, currentRole);

  return (
    <>
      <Navbar items={visibleItems} currentPath={pathname} />
      <main style={{ paddingTop: 80 }}>
        {children}
      </main>
    </>
  );
}
