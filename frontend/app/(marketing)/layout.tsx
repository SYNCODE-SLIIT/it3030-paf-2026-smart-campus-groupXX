import React from 'react';

import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(238,202,68,.12), transparent 28%),
          radial-gradient(circle at top right, rgba(43,109,232,.12), transparent 26%),
          linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0))
        `,
      }}
    >
      <MarketingNavbar />
      <main style={{ paddingTop: 104 }}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
