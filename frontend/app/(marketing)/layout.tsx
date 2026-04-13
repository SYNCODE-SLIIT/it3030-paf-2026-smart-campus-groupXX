import React from 'react';

import { MarketingNavbar } from '@/components/layout/MarketingNavbar';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNavbar />
      <main style={{ paddingTop: 80 }}>
        {children}
      </main>
    </>
  );
}
