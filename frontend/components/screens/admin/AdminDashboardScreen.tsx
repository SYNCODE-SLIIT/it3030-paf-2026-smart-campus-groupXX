'use client';

import React from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  TicketPlus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { UserIdentityCell } from '@/components/screens/admin/UserIdentityCell';
import {
  Alert,
  Button,
  Card,
  Chip,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { SubmitTicketModal } from '@/components/tickets';
import { getErrorMessage, listAuditLogs, listUsers } from '@/lib/api-client';
import type { AuditLogResponse, UserResponse } from '@/lib/api-types';
import {
  getUserAvatarInitials,
  getUserDisplayName,
  getUserTypeChipColor,
  getUserTypeLabel,
} from '@/lib/user-display';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function auditActionLabel(action: AuditLogResponse['action']) {
  return action.replaceAll('_', ' ');
}

function relativeTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown';

  const diffMs = timestamp - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), 'minute');
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), 'hour');
  }
  return rtf.format(Math.round(diffMs / day), 'day');
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function emailInitials(email: string | null | undefined) {
  if (!email) return 'NA';
  const namePart = email.split('@')[0] ?? '';
  const chunks = namePart
    .split(/[._-]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return namePart.slice(0, 2).toUpperCase() || 'NA';
  }

  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
}

function auditChipColor(action: AuditLogResponse['action']): 'yellow' | 'red' | 'green' | 'blue' {
  const normalized = action.toUpperCase();

  if (normalized.includes('DELETE') || normalized.includes('SUSPEND') || normalized.includes('REVOKE') || normalized.includes('FAIL')) {
    return 'red';
  }
  if (normalized.includes('CREATE') || normalized.includes('INVITE') || normalized.includes('APPROVE') || normalized.includes('ACTIVATE')) {
    return 'green';
  }
  if (normalized.includes('UPDATE') || normalized.includes('RESET') || normalized.includes('CHANGE')) {
    return 'blue';
  }
  return 'yellow';
}

function getRoleDirectoryPath(userType: UserResponse['userType']) {
  switch (userType) {
    case 'STUDENT':
      return '/admin/students';
    case 'FACULTY':
      return '/admin/faculty';
    case 'MANAGER':
      return '/admin/managers';
    case 'ADMIN':
      return '/admin/admins';
  }
}

function getUserDetailPath(user: UserResponse) {
  return `${getRoleDirectoryPath(user.userType)}/${user.id}`;
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

function DashboardMetric({
  label,
  value,
  caption,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  onClick?: () => void;
}) {
  const content = (
    <Card hoverable style={{ height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 112 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--text-label)',
            }}
          >
            {label}
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: 'var(--surface-2)',
              color: 'var(--yellow-700)',
              flexShrink: 0,
            }}
          >
            <Icon size={17} strokeWidth={2.2} />
          </span>
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, lineHeight: 1.05, color: 'var(--text-h)' }}>
            {value}
          </p>
          <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>
            {caption}
          </p>
        </div>
      </div>
    </Card>
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: '100%', height: '100%', padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
      aria-label={`Open ${label}`}
    >
      {content}
    </button>
  );
}

function ActionButton({
  label,
  caption,
  icon: Icon,
  onClick,
  primary = false,
}: {
  label: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={primary ? 'admin-action-button admin-action-button-primary' : 'admin-action-button'}
      onClick={onClick}
    >
      <span className="admin-action-icon">
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="admin-action-label">{label}</span>
        <span className="admin-action-caption">{caption}</span>
      </span>
    </button>
  );
}

export function AdminDashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activityError, setActivityError] = React.useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      setActivityError(null);

      try {
        const [usersResult, activityResult] = await Promise.allSettled([
          listUsers(token),
          listAuditLogs(token, { page: 0, size: 6 }),
        ]);

        if (cancelled) {
          return;
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value);
        } else {
          setUsers([]);
          setError(getErrorMessage(usersResult.reason, 'We could not load the dashboard.'));
        }

        if (activityResult.status === 'fulfilled') {
          setRecentActivity(activityResult.value.items);
        } else {
          setRecentActivity([]);
          setActivityError(getErrorMessage(activityResult.reason, 'Recent activity is temporarily unavailable.'));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError, 'We could not load the dashboard.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const now = Date.now();
  const studentUsers = users.filter((user) => user.userType === 'STUDENT');
  const facultyUsers = users.filter((user) => user.userType === 'FACULTY');
  const managerUsers = users.filter((user) => user.userType === 'MANAGER');
  const adminUsers = users.filter((user) => user.userType === 'ADMIN');

  const activeAccounts = users.filter((user) => user.accountStatus === 'ACTIVE');
  const pendingInvites = users.filter((user) => user.accountStatus === 'INVITED');
  const suspendedUsers = users.filter((user) => user.accountStatus === 'SUSPENDED');
  const pendingStudentOnboarding = studentUsers.filter((user) => !user.studentProfile?.onboardingCompleted);
  const activeThisWeek = users.filter((user) => user.lastLoginAt && now - new Date(user.lastLoginAt).getTime() < ONE_WEEK_MS);
  const newThisWeek = users.filter((user) => {
    const invitedAt = new Date(user.invitedAt).getTime();
    return !Number.isNaN(invitedAt) && now - invitedAt < ONE_WEEK_MS;
  });
  const recentAccounts = [...users]
    .sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime())
    .slice(0, 5);

  const totalUsers = users.length;
  const activeAccountsRatio = totalUsers === 0 ? 0 : Math.round((activeAccounts.length / totalUsers) * 100);
  const activeThisWeekRatio = totalUsers === 0 ? 0 : Math.round((activeThisWeek.length / totalUsers) * 100);
  const accountAvailability = totalUsers === 0
    ? 100
    : Math.round(((totalUsers - suspendedUsers.length) / totalUsers) * 100);
  const onboardingCompletion = studentUsers.length === 0
    ? 100
    : Math.round(((studentUsers.length - pendingStudentOnboarding.length) / studentUsers.length) * 100);
  const inviteClearance = totalUsers === 0
    ? 100
    : Math.max(0, Math.round(((totalUsers - pendingInvites.length) / totalUsers) * 100));

  const roleDistribution = [
    { label: 'Students', count: studentUsers.length, color: 'yellow' as const, path: '/admin/students' },
    { label: 'Faculty', count: facultyUsers.length, color: 'blue' as const, path: '/admin/faculty' },
    { label: 'Managers', count: managerUsers.length, color: 'green' as const, path: '/admin/managers' },
    { label: 'Admins', count: adminUsers.length, color: 'orange' as const, path: '/admin/admins' },
  ].map((item) => ({
    ...item,
    percent: totalUsers === 0 ? 0 : Math.round((item.count / totalUsers) * 100),
  }));

  const attentionItems = [
    {
      label: 'Pending invite follow-up',
      caption: 'Send reminders or review old invites',
      value: pendingInvites.length,
      path: '/admin/users',
      icon: UserPlus,
      color: pendingInvites.length > 0 ? 'orange' : 'green',
    },
    {
      label: 'Student onboarding',
      caption: 'Students still missing profile setup',
      value: pendingStudentOnboarding.length,
      path: '/admin/students',
      icon: GraduationCap,
      color: pendingStudentOnboarding.length > 0 ? 'yellow' : 'green',
    },
    {
      label: 'Suspended accounts',
      caption: 'Accounts requiring access review',
      value: suspendedUsers.length,
      path: '/admin/users',
      icon: AlertCircle,
      color: suspendedUsers.length > 0 ? 'red' : 'green',
    },
  ] as const;

  return (
    <div className="admin-dashboard-screen">
      <style>{`
        .admin-dashboard-screen {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .admin-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .admin-dashboard-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }
        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }
        .admin-card-span-3 { grid-column: span 3; }
        .admin-card-span-4 { grid-column: span 4; }
        .admin-card-span-5 { grid-column: span 5; }
        .admin-card-span-7 { grid-column: span 7; }
        .admin-card-span-8 { grid-column: span 8; }
        .admin-card-span-12 { grid-column: span 12; }
        .admin-card-fill {
          height: 100%;
        }
        .admin-health-layout {
          display: grid;
          grid-template-columns: minmax(220px, .82fr) minmax(0, 1.18fr);
          gap: 18px;
          align-items: stretch;
        }
        .admin-health-score {
          display: grid;
          align-content: space-between;
          gap: 16px;
          min-height: 196px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
        }
        .admin-inline-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .admin-inline-stat {
          min-height: 74px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
        }
        .admin-inline-stat strong {
          display: block;
          margin-top: 8px;
          font-family: var(--font-display);
          font-size: 22px;
          line-height: 1;
          color: var(--text-h);
        }
        .admin-inline-stat span {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .15em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .admin-action-button,
        .admin-attention-button,
        .admin-role-button,
        .admin-account-button {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
          color: var(--text-body);
          cursor: pointer;
          text-align: left;
          transition: border-color .18s ease, transform .14s ease, background .18s ease;
        }
        .admin-action-button:hover,
        .admin-attention-button:hover,
        .admin-role-button:hover,
        .admin-account-button:hover {
          border-color: rgba(238,202,68,.34);
          transform: translateY(-1px);
        }
        .admin-action-button {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
        }
        .admin-action-button-primary {
          background: rgba(238,202,68,.12);
          border-color: rgba(238,202,68,.32);
        }
        .admin-action-icon {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--surface);
          color: var(--yellow-700);
          flex-shrink: 0;
        }
        .admin-action-label,
        .admin-action-caption {
          display: block;
          min-width: 0;
        }
        .admin-action-label {
          color: var(--text-h);
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 800;
        }
        .admin-action-caption {
          margin-top: 3px;
          color: var(--text-muted);
          font-size: 11.5px;
          line-height: 1.35;
        }
        .admin-role-button {
          min-height: 82px;
          padding: 12px;
        }
        .admin-role-header,
        .admin-account-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }
        .admin-role-label,
        .admin-account-label {
          color: var(--text-h);
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 800;
        }
        .admin-role-count,
        .admin-account-date {
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .13em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .admin-attention-button {
          min-height: 76px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 12px;
        }
        .admin-attention-icon {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--surface);
          color: var(--yellow-700);
        }
        .admin-attention-title {
          display: block;
          color: var(--text-h);
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.25;
        }
        .admin-attention-caption {
          display: block;
          margin-top: 3px;
          color: var(--text-muted);
          font-size: 11.5px;
          line-height: 1.35;
        }
        .admin-attention-value {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 900;
          color: var(--text-h);
        }
        .admin-account-button {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          min-height: 64px;
          padding: 10px 12px;
        }
        .admin-account-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .admin-activity-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--yellow-700);
          background: rgba(238,202,68,.08);
          border: 1px solid rgba(238,202,68,.24);
          flex-shrink: 0;
        }
        @media (max-width: 1180px) {
          .admin-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .admin-card-span-3,
          .admin-card-span-4,
          .admin-card-span-5,
          .admin-card-span-7,
          .admin-card-span-8 {
            grid-column: span 6;
          }
          .admin-health-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 760px) {
          .admin-dashboard-screen {
            gap: 24px;
          }
          .admin-kpi-grid,
          .admin-dashboard-grid {
            grid-template-columns: 1fr;
          }
          .admin-card-span-3,
          .admin-card-span-4,
          .admin-card-span-5,
          .admin-card-span-7,
          .admin-card-span-8,
          .admin-card-span-12 {
            grid-column: 1;
          }
          .admin-inline-stat-grid {
            grid-template-columns: 1fr;
          }
          .admin-account-button {
            grid-template-columns: 1fr;
          }
          .admin-account-meta {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="admin-dashboard-header">
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.35em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            System Console
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Admin Dashboard
          </h1>
          <p style={{ margin: '6px 0 0', maxWidth: 720, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, lineHeight: 1.55 }}>
            Monitor users, onboarding, account status, and recent admin activity from one clean overview.
          </p>
        </div>
        <div className="admin-dashboard-actions">
          <Button variant="subtle" size="sm" iconLeft={<BookOpen size={14} />} onClick={() => router.push('/admin/audit-log')}>
            Audit Log
          </Button>
          <Button variant="primary" size="sm" iconLeft={<UserPlus size={14} />} onClick={() => router.push('/admin/users')}>
            Add User
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Dashboard unavailable">
          {error}
        </Alert>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="admin-kpi-grid">
            <Skeleton variant="rect" height={160} />
            <Skeleton variant="rect" height={160} />
            <Skeleton variant="rect" height={160} />
            <Skeleton variant="rect" height={160} />
          </div>
          <Skeleton variant="rect" height={260} />
          <Skeleton variant="rect" height={320} />
        </div>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <DashboardMetric
              label="Total Users"
              value={totalUsers}
              caption={`${newThisWeek.length} new account${newThisWeek.length === 1 ? '' : 's'} this week`}
              icon={Users}
              onClick={() => router.push('/admin/users')}
            />
            <DashboardMetric
              label="Active Accounts"
              value={activeAccounts.length}
              caption={`${activeAccountsRatio}% of the directory is active`}
              icon={ShieldCheck}
              onClick={() => router.push('/admin/users')}
            />
            <DashboardMetric
              label="Pending Invites"
              value={pendingInvites.length}
              caption="Accounts waiting for first access"
              icon={UserPlus}
              onClick={() => router.push('/admin/users')}
            />
            <DashboardMetric
              label="Active This Week"
              value={activeThisWeek.length}
              caption={`${activeThisWeekRatio}% logged in recently`}
              icon={Activity}
              onClick={() => router.push('/admin/analytics')}
            />
          </div>

          <div className="admin-dashboard-grid">
            <Card className="admin-card-span-8 admin-card-fill">
              <div style={{ display: 'grid', gap: 16, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <SectionTitle title="Account Health" caption="The most important account lifecycle signals." />
                  <Chip color={accountAvailability >= 95 ? 'green' : accountAvailability >= 85 ? 'orange' : 'red'} dot>
                    {accountAvailability >= 95 ? 'Healthy' : accountAvailability >= 85 ? 'Review' : 'Attention'}
                  </Chip>
                </div>

                <div className="admin-health-layout">
                  <div className="admin-health-score">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700 }}>Directory availability</p>
                        <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 900, lineHeight: 1, color: 'var(--text-h)' }}>
                          {accountAvailability}%
                        </p>
                      </div>
                      <span
                        style={{
                          width: 42,
                          height: 42,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          background: 'var(--surface)',
                          color: 'var(--yellow-700)',
                        }}
                      >
                        <ShieldCheck size={20} strokeWidth={2.3} />
                      </span>
                    </div>
                    <Progress value={accountAvailability} color={accountAvailability >= 95 ? 'green' : accountAvailability >= 85 ? 'orange' : 'red'} size="sm" />
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.45 }}>
                      Availability is based on active directory access and suspended account pressure.
                    </p>
                  </div>

                  <div style={{ display: 'grid', alignContent: 'space-between', gap: 14 }}>
                    <div className="admin-inline-stat-grid">
                      <div className="admin-inline-stat">
                        <span>Active</span>
                        <strong>{activeAccounts.length}</strong>
                      </div>
                      <div className="admin-inline-stat">
                        <span>Invited</span>
                        <strong>{pendingInvites.length}</strong>
                      </div>
                      <div className="admin-inline-stat">
                        <span>Suspended</span>
                        <strong>{suspendedUsers.length}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <Progress label="Active accounts" value={activeAccountsRatio} color="green" showValue size="sm" />
                      <Progress label="Invite clearance" value={inviteClearance} color="yellow" showValue size="sm" />
                      <Progress label="Student onboarding" value={onboardingCompletion} color="blue" showValue size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="admin-card-span-4 admin-card-fill">
              <div style={{ display: 'grid', gap: 12, height: '100%' }}>
                <SectionTitle title="Quick Actions" caption="Frequent admin workflows." />
                <div style={{ display: 'grid', gap: 9 }}>
                  <ActionButton
                    primary
                    label="Add User"
                    caption="Invite a new campus account"
                    icon={UserPlus}
                    onClick={() => router.push('/admin/users')}
                  />
                  <ActionButton
                    label="Manage Users"
                    caption="Search, filter, and update access"
                    icon={Users}
                    onClick={() => router.push('/admin/users')}
                  />
                  <ActionButton
                    label="New Ticket"
                    caption="Create a support request"
                    icon={TicketPlus}
                    onClick={() => setSubmitModalOpen(true)}
                  />
                  <ActionButton
                    label="Notifications"
                    caption="Review campus messages"
                    icon={Bell}
                    onClick={() => router.push('/admin/notifications')}
                  />
                </div>
              </div>
            </Card>

            <Card className="admin-card-span-5 admin-card-fill">
              <div style={{ display: 'grid', gap: 14, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <SectionTitle title="Role Distribution" caption="Current users by directory role." />
                  <Button variant="ghost" size="xs" onClick={() => router.push('/admin/users')}>
                    Manage
                  </Button>
                </div>
                <div style={{ display: 'grid', gap: 9 }}>
                  {roleDistribution.map((entry) => (
                    <button key={entry.label} type="button" className="admin-role-button" onClick={() => router.push(entry.path)}>
                      <div className="admin-role-header">
                        <span className="admin-role-label">{entry.label}</span>
                        <span className="admin-role-count">{entry.count} users</span>
                      </div>
                      <Progress value={entry.percent} color={entry.color} showValue size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="admin-card-span-3 admin-card-fill">
              <div style={{ display: 'grid', gap: 12, height: '100%' }}>
                <SectionTitle title="Needs Attention" caption="Start with these admin checks." />
                <div style={{ display: 'grid', gap: 9 }}>
                  {attentionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} type="button" className="admin-attention-button" onClick={() => router.push(item.path)}>
                        <span className="admin-attention-icon">
                          <Icon size={16} strokeWidth={2.25} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="admin-attention-title">{item.label}</span>
                          <span className="admin-attention-caption">{item.caption}</span>
                        </span>
                        <span className="admin-attention-value">{item.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card className="admin-card-span-4 admin-card-fill">
              <div style={{ display: 'grid', gap: 12, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <SectionTitle title="Recent Accounts" caption="Newest accounts in the directory." />
                  <Button variant="ghost" size="xs" onClick={() => router.push('/admin/users')}>
                    View All
                  </Button>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {recentAccounts.length === 0 ? (
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No users have been created yet.</p>
                  ) : (
                    recentAccounts.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="admin-account-button"
                        onClick={() => router.push(getUserDetailPath(user))}
                        aria-label={`Open ${getUserDisplayName(user)} profile`}
                      >
                        <UserIdentityCell
                          name={getUserDisplayName(user)}
                          email={user.email}
                          initials={getUserAvatarInitials(user)}
                          src={user.userType === 'STUDENT' ? user.studentProfile?.profileImageUrl : undefined}
                        />
                        <span className="admin-account-meta">
                          <Chip color={getUserTypeChipColor(user.userType)} dot size="sm">
                            {getUserTypeLabel(user.userType)}
                          </Chip>
                          <span className="admin-account-date">{formatDate(user.invitedAt)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </Card>

            <Card className="admin-card-span-12">
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <SectionTitle title="Recent Activity" caption="Latest account lifecycle actions from audit logs." />
                  <Button variant="ghost" size="xs" onClick={() => router.push('/admin/audit-log')}>
                    View All
                  </Button>
                </div>

                {activityError && (
                  <Alert variant="warning" title="Activity unavailable">
                    {activityError}
                  </Alert>
                )}

                {!activityError && recentActivity.length === 0 && (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No recent activity found.</p>
                )}

                {!activityError && recentActivity.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow hoverable={false}>
                          <TableHeader>Actor</TableHeader>
                          <TableHeader>Action</TableHeader>
                          <TableHeader>Target</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader style={{ textAlign: 'right' }}>Time</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentActivity.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <span className="admin-activity-avatar">{emailInitials(entry.performedByEmail)}</span>
                                <span style={{ color: 'var(--text-h)', fontWeight: 650, wordBreak: 'break-word' }}>{entry.performedByEmail ?? 'System'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Chip color={auditChipColor(entry.action)} dot>
                                {auditActionLabel(entry.action)}
                              </Chip>
                            </TableCell>
                            <TableCell style={{ color: 'var(--text-body)', fontSize: 12.5, wordBreak: 'break-word' }}>
                              {entry.targetUserEmail ?? '-'}
                            </TableCell>
                            <TableCell>
                              <Chip color={auditChipColor(entry.action)} size="sm">
                                Recorded
                              </Chip>
                            </TableCell>
                            <TableCell style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {relativeTime(entry.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      <SubmitTicketModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={() => {
          showToast('success', 'Ticket submitted', 'Your support ticket has been created.');
        }}
      />
    </div>
  );
}
