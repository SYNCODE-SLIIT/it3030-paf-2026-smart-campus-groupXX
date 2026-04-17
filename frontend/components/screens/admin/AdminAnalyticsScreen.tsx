'use client';

import React from 'react';
import { Activity, BarChart2, Clock, ShieldCheck, UserPlus, Users } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Card, Chip, Skeleton } from '@/components/ui';
import { getErrorMessage, listUsers } from '@/lib/api-client';
import type { AccountStatus, UserResponse, UserType } from '@/lib/api-types';
import { getAccountStatusLabel, getUserTypeLabel } from '@/lib/user-display';

const roleOrder: UserType[] = ['STUDENT', 'FACULTY', 'MANAGER', 'ADMIN'];
const statusOrder: AccountStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED'];

function percent(value: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function CountCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <Card hoverable>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text-h)' }}>
            {value}
          </p>
          <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
            {caption}
          </p>
        </div>
        <span style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--yellow-700)', flexShrink: 0 }}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
    </Card>
  );
}

function MeterRow({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
        <span style={{ color: 'var(--text-body)', fontWeight: 700 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value} ({percent(value, total)})</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div
          style={{
            width: percent(value, total),
            height: '100%',
            borderRadius: 999,
            background: 'var(--yellow-400)',
            boxShadow: '0 2px 10px rgba(238,202,68,.25)',
          }}
        />
      </div>
    </div>
  );
}

export function AdminAnalyticsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const nextUsers = await listUsers(token);
        if (!cancelled) setUsers(nextUsers);
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError, 'We could not load analytics.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.accountStatus === 'ACTIVE').length;
  const pendingInvites = users.filter((user) => user.accountStatus === 'INVITED').length;
  const inviteSends = users.reduce((total, user) => total + user.inviteSendCount, 0);
  const students = users.filter((user) => user.userType === 'STUDENT');
  const completedStudents = students.filter((user) => user.studentProfile?.onboardingCompleted).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Insights
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: 0, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Analytics
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Role distribution, account health, invite activity, and onboarding completion.
          </p>
        </div>
        <Chip color="yellow" dot>
          Live Directory
        </Chip>
      </div>

      {error && (
        <Alert variant="error" title="Analytics unavailable">
          {error}
        </Alert>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton variant="rect" height={96} />
          <Skeleton variant="rect" height={260} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <CountCard label="Total Users" value={totalUsers} caption="Across all roles" icon={Users} />
            <CountCard label="Active Users" value={activeUsers} caption={`${percent(activeUsers, totalUsers)} active`} icon={Activity} />
            <CountCard label="Pending Invites" value={pendingInvites} caption="Awaiting access setup" icon={Clock} />
            <CountCard label="Invite Sends" value={inviteSends} caption="Generated access links" icon={UserPlus} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <BarChart2 size={18} color="var(--yellow-600)" />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  Role Distribution
                </p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {roleOrder.map((role) => (
                  <MeterRow
                    key={role}
                    label={getUserTypeLabel(role)}
                    value={users.filter((user) => user.userType === role).length}
                    total={totalUsers}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <ShieldCheck size={18} color="var(--yellow-600)" />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  Account Status
                </p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {statusOrder.map((status) => (
                  <MeterRow
                    key={status}
                    label={getAccountStatusLabel(status)}
                    value={users.filter((user) => user.accountStatus === status).length}
                    total={totalUsers}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <Activity size={18} color="var(--yellow-600)" />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  Student Onboarding
                </p>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <MeterRow label="Completed" value={completedStudents} total={students.length} />
                <MeterRow label="Pending" value={students.length - completedStudents} total={students.length} />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
