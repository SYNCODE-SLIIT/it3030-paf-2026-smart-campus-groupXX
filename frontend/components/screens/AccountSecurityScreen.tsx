'use client';

import React from 'react';

import { PasswordSetupCard } from '@/components/account/PasswordSetupCard';

export function AccountSecurityScreen() {
  return (
    <div style={{ maxWidth: 720, display: 'grid', gap: 18 }}>
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-h)',
          }}
        >
          Account Security
        </h1>
      </div>

      <PasswordSetupCard description="Set or update your password for email sign-in." />
    </div>
  );
}
