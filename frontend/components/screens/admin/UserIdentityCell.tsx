import React from 'react';

import { Avatar } from '@/components/ui';

interface UserIdentityCellProps {
  name: string;
  email: string;
  initials: string;
  src?: string | null;
}

export function UserIdentityCell({ name, email, initials, src }: UserIdentityCellProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar initials={initials} src={src ?? undefined} size="sm" />
      <div>
        <div
          style={{
            color: 'var(--text-h)',
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            marginTop: 1,
          }}
        >
          {email}
        </div>
      </div>
    </div>
  );
}
