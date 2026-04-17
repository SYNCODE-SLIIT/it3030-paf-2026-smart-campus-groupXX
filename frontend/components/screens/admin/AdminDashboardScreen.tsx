'use client';

import React from 'react';
import { Activity, AlertCircle, Bell, BookOpen, GraduationCap, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { UserIdentityCell } from '@/components/screens/admin/UserIdentityCell';
import { Alert, Button, Card, Chip, Skeleton } from '@/components/ui';
import { getErrorMessage, listUsers } from '@/lib/api-client';
import type { UserResponse } from '@/lib/api-types';
import {
  getAccountStatusChipColor,
  getAccountStatusLabel,
  getManagerRoleInitials,
  getUserAvatarInitials,
  getUserDisplayName,
  getUserTypeChipColor,
  getUserTypeLabel,
} from '@/lib/user-display';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function avatarInitials(user: UserResponse) {
  return user.userType === 'MANAGER' ? getManagerRoleInitials(user.managerRole) : getUserAvatarInitials(user);
}

function DashboardMetric({
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
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text-h)' }}>
            {value}
          </p>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
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

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
        {title}
      </p>
      {caption && (
        <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>
          {caption}
        </p>
      )}
    </div>
  );
}

export function AdminDashboardScreen() {
  const router = useRouter();
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
        if (!cancelled) setError(getErrorMessage(loadError, 'We could not load the dashboard.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const now = Date.now();
  const pendingInvites = users.filter((user) => user.accountStatus === 'INVITED');
  const suspendedUsers = users.filter((user) => user.accountStatus === 'SUSPENDED');
  const pendingStudentOnboarding = users.filter(
    (user) => user.userType === 'STUDENT' && !user.studentProfile?.onboardingCompleted,
  );
  const activeThisWeek = users.filter((user) => user.lastLoginAt && now - new Date(user.lastLoginAt).getTime() < ONE_WEEK_MS);
  const recentAccounts = [...users]
    .sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime())
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <style>{`
        .admin-dashboard-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr);
          gap: 18px;
          align-items: start;
        }
        .admin-recent-account-row {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto auto;
          gap: 14px;
          align-items: center;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
        }
        .admin-recent-account-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 900px) {
          .admin-dashboard-main-grid,
          .admin-recent-account-row {
            grid-template-columns: 1fr;
          }
          .admin-recent-account-meta {
            justify-content: flex-start;
          }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Console
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: 0, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Review what needs attention, jump into role directories, and manage the account lifecycle.
          </p>
        </div>
        <Chip color="yellow" dot>
          Operations
        </Chip>
      </div>

      {error && (
        <Alert variant="error" title="Dashboard unavailable">
          {error}
        </Alert>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton variant="rect" height={96} />
          <Skeleton variant="rect" height={220} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <DashboardMetric label="Pending Invites" value={pendingInvites.length} caption="Waiting for first access" icon={UserPlus} />
            <DashboardMetric label="Student Onboarding" value={pendingStudentOnboarding.length} caption="Students still incomplete" icon={GraduationCap} />
            <DashboardMetric label="Suspended Accounts" value={suspendedUsers.length} caption="Access currently blocked" icon={ShieldCheck} />
            <DashboardMetric label="Active This Week" value={activeThisWeek.length} caption="Users with recent login" icon={Activity} />
          </div>

          <div className="admin-dashboard-main-grid">
            <Card>
              <div style={{ display: 'grid', gap: 18 }}>
                <SectionTitle title="Quick Actions" caption="Common admin tasks are kept close to the dashboard." />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button variant="primary" size="sm" iconLeft={<UserPlus size={14} />} onClick={() => router.push('/admin/users')}>
                    Add User
                  </Button>
                  <Button variant="subtle" size="sm" iconLeft={<Users size={14} />} onClick={() => router.push('/admin/users')}>
                    User Management
                  </Button>
                  <Button variant="subtle" size="sm" iconLeft={<Bell size={14} />} onClick={() => router.push('/admin/notifications')}>
                    Notifications
                  </Button>
                  <Button variant="subtle" size="sm" iconLeft={<BookOpen size={14} />} onClick={() => router.push('/admin/reports')}>
                    Reports
                  </Button>
                </div>

                <SectionTitle title="Role Directories" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Students', path: '/admin/students', count: users.filter((user) => user.userType === 'STUDENT').length },
                    { label: 'Faculty', path: '/admin/faculty', count: users.filter((user) => user.userType === 'FACULTY').length },
                    { label: 'Managers', path: '/admin/managers', count: users.filter((user) => user.userType === 'MANAGER').length },
                    { label: 'Admins', path: '/admin/admins', count: users.filter((user) => user.userType === 'ADMIN').length },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => router.push(item.path)}
                      style={{
                        minHeight: 82,
                        padding: '14px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-2)',
                        color: 'var(--text-h)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 850 }}>{item.label}</span>
                      <span style={{ display: 'block', marginTop: 7, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {item.count} users
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'grid', gap: 16 }}>
                <SectionTitle title="Needs Attention" caption="Start here before reviewing broader analytics." />
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    { label: 'Pending invite follow-up', value: pendingInvites.length, path: '/admin/users', icon: UserPlus },
                    { label: 'Incomplete student onboarding', value: pendingStudentOnboarding.length, path: '/admin/students', icon: GraduationCap },
                    { label: 'Suspended account review', value: suspendedUsers.length, path: '/admin/users', icon: AlertCircle },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => router.push(item.path)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          minHeight: 58,
                          padding: '12px 14px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--surface-2)',
                          color: 'var(--text-body)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 750 }}>
                          <Icon size={16} color="var(--yellow-700)" />
                          {item.label}
                        </span>
                        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-h)' }}>{item.value}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div style={{ display: 'grid', gap: 16 }}>
              <SectionTitle title="Recent Accounts" caption="Newest accounts created in the directory." />
              <div style={{ display: 'grid', gap: 10 }}>
                {recentAccounts.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No users have been created yet.</p>
                ) : (
                  recentAccounts.map((user) => (
                    <div key={user.id} className="admin-recent-account-row">
                      <UserIdentityCell
                        name={getUserDisplayName(user)}
                        email={user.email}
                        initials={avatarInitials(user)}
                        src={user.userType === 'STUDENT' ? user.studentProfile?.profileImageUrl : undefined}
                      />
                      <Chip color={getUserTypeChipColor(user.userType)} dot>
                        {getUserTypeLabel(user.userType)}
                      </Chip>
                      <div className="admin-recent-account-meta">
                        <Chip color={getAccountStatusChipColor(user.accountStatus)} dot>
                          {getAccountStatusLabel(user.accountStatus)}
                        </Chip>
                        <span style={{ minWidth: 84, textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                          {formatDate(user.invitedAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
