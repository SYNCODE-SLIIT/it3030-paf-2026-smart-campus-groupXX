'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui';
import { triggerRouteProgress } from '@/lib/route-progress';

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  iconRight,
}: {
  href: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  iconRight?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Button
      variant={variant}
      size={size}
      iconRight={iconRight}
      onClick={() => {
        triggerRouteProgress();
        router.push(href);
      }}
    >
      {children}
    </Button>
  );
}
