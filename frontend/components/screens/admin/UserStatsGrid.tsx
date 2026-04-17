import React from 'react';
import { Activity, Clock, UserPlus, Users } from 'lucide-react';

import { Card } from '@/components/ui';

interface UserStatsGridProps {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  newThisWeek: number;
}

const statDefs = [
  { key: 'total'   as const, label: 'Total Users',    subtitle: 'All registered users',  icon: Users    },
  { key: 'active'  as const, label: 'Active Users',   subtitle: 'Currently active',       icon: Activity },
  { key: 'pending' as const, label: 'Pending Invites', subtitle: 'Awaiting activation',   icon: Clock    },
  { key: 'new'     as const, label: 'New Sign-ups',    subtitle: 'This week',             icon: UserPlus },
] as const;

export function UserStatsGrid({ totalUsers, activeUsers, pendingInvites, newThisWeek }: UserStatsGridProps) {
  const values: Record<'total' | 'active' | 'pending' | 'new', number> = {
    total:   totalUsers,
    active:  activeUsers,
    pending: pendingInvites,
    new:     newThisWeek,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
      }}
    >
      {statDefs.map(({ key, label, subtitle, icon: Icon }) => (
        <Card key={key} hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                {label}
              </span>
              <div
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: 'var(--text-h)',
                }}
              >
                {values[key]}
              </div>
              <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                {subtitle}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
