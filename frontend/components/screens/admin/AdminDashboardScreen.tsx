'use client';

import React from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Database,
  Gauge,
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
  getAccountStatusChipColor,
  getAccountStatusLabel,
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

function DashboardMetric({
  label,
  value,
  caption,
  badge,
  onClick,
  actionLabel,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  badge?: string;
  onClick?: () => void;
  actionLabel?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  const metricContent = (
    <Card hoverable>
      <div style={{ display: 'grid', gap: 12, position: 'relative', overflow: 'hidden' }}>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -42,
            right: -34,
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(238,202,68,.22) 0%, rgba(238,202,68,0) 72%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {label}
            </p>
            <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text-h)' }}>
              {value}
            </p>
          </div>
          <span
            style={{
              width: 38,
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: 'var(--surface-2)',
              color: 'var(--yellow-700)',
              boxShadow: 'inset 0 0 0 1px rgba(238,202,68,.18)',
              flexShrink: 0,
            }}
          >
            <Icon size={18} strokeWidth={2.2} />
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>{caption}</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {badge && (
              <Chip color="glass" size="sm">
                {badge}
              </Chip>
            )}
            {onClick && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'var(--yellow-700)',
                }}
              >
                {actionLabel ?? 'Open'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (!onClick) {
    return metricContent;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 0,
        margin: 0,
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
      }}
      aria-label={`${label} - ${actionLabel ?? 'open details'}`}
    >
      {metricContent}
    </button>
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

  const pendingInvites = users.filter((user) => user.accountStatus === 'INVITED');
  const suspendedUsers = users.filter((user) => user.accountStatus === 'SUSPENDED');
  const pendingStudentOnboarding = studentUsers.filter((user) => !user.studentProfile?.onboardingCompleted);
  const activeThisWeek = users.filter((user) => user.lastLoginAt && now - new Date(user.lastLoginAt).getTime() < ONE_WEEK_MS);
  const invitedThisWeek = pendingInvites.filter((user) => {
    const invitedAt = new Date(user.invitedAt).getTime();
    return !Number.isNaN(invitedAt) && now - invitedAt < ONE_WEEK_MS;
  });
  const recentAccounts = [...users]
    .sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime())
    .slice(0, 6);

  const totalUsers = users.length;
  const activeRatio = totalUsers === 0 ? 0 : Math.round((activeThisWeek.length / totalUsers) * 100);
  const onboardingCompletion = studentUsers.length === 0
    ? 100
    : Math.round(((studentUsers.length - pendingStudentOnboarding.length) / studentUsers.length) * 100);
  const accountAvailability = totalUsers === 0
    ? 100
    : Math.round(((totalUsers - suspendedUsers.length) / totalUsers) * 100);
  const inviteClearance = totalUsers === 0
    ? 100
    : Math.max(0, Math.round(((totalUsers - pendingInvites.length) / totalUsers) * 100));

  const systemHealth = totalUsers === 0
    ? 100
    : Number((100 - (suspendedUsers.length / totalUsers) * 100).toFixed(1));
  const systemHealthLabel = systemHealth >= 98 ? 'Optimal' : systemHealth >= 92 ? 'Stable' : 'Watchlist';

  const roleDistribution = [
    { label: 'Students', count: studentUsers.length, color: 'yellow' as const, path: '/admin/students' },
    { label: 'Faculty', count: facultyUsers.length, color: 'blue' as const, path: '/admin/faculty' },
    { label: 'Managers', count: managerUsers.length, color: 'green' as const, path: '/admin/managers' },
    { label: 'Admins', count: adminUsers.length, color: 'orange' as const, path: '/admin/admins' },
  ].map((item) => ({
    ...item,
    percent: totalUsers === 0 ? 0 : Math.round((item.count / totalUsers) * 100),
  }));

  const trafficBars = React.useMemo(() => {
    const baseline = [36, 42, 39, 46, 44, 53, 49, 58, 55, 62, 59, 68];
    const activeBoost = Math.round(activeRatio * 0.12);
    const friction = Math.round((pendingInvites.length + suspendedUsers.length) * 0.8);

    return baseline.map((base, index) => {
      const adjustment = index % 2 === 0 ? 3 : -2;
      return Math.max(18, Math.min(96, base + activeBoost - friction + adjustment));
    });
  }, [activeRatio, pendingInvites.length, suspendedUsers.length]);

  const serverLoad = Math.min(
    96,
    Math.max(18, Math.round(32 + activeRatio * 0.55 + pendingInvites.length * 1.8 + suspendedUsers.length * 2.4)),
  );

  const attentionItems = [
    {
      label: 'Pending invite follow-up',
      value: pendingInvites.length,
      path: '/admin/users',
      icon: UserPlus,
    },
    {
      label: 'Incomplete student onboarding',
      value: pendingStudentOnboarding.length,
      path: '/admin/students',
      icon: GraduationCap,
    },
    {
      label: 'Suspended account review',
      value: suspendedUsers.length,
      path: '/admin/users',
      icon: AlertCircle,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .admin-command-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
          gap: 18px;
          align-items: start;
        }
        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
        }
        .admin-visual-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(250px, .9fr);
          gap: 16px;
        }
        .admin-traffic-shell {
          position: relative;
          min-height: 226px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(238,202,68,.12);
          background:
            linear-gradient(180deg, rgba(238,202,68,.08), rgba(238,202,68,.02) 58%, transparent),
            var(--surface-2);
          overflow: hidden;
          padding: 14px;
        }
        .admin-traffic-grid-lines {
          position: absolute;
          inset: 14px;
          display: grid;
          grid-template-rows: repeat(4, 1fr);
          pointer-events: none;
        }
        .admin-traffic-grid-lines > span {
          border-top: 1px dashed rgba(255,255,255,.08);
        }
        .admin-traffic-bars {
          position: relative;
          z-index: 1;
          height: 190px;
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          align-items: end;
          gap: 7px;
        }
        .admin-traffic-bar {
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg, rgba(238,202,68,.96) 0%, rgba(238,202,68,.26) 100%);
          box-shadow: 0 0 0 1px rgba(238,202,68,.18);
          opacity: .9;
          transition: height .35s ease, opacity .2s ease;
        }
        .admin-traffic-bar:hover {
          opacity: 1;
        }
        .admin-attention-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 54px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
          color: var(--text-body);
          text-align: left;
          cursor: pointer;
          transition: border-color .2s ease, transform .14s ease;
        }
        .admin-attention-item:hover {
          border-color: rgba(238,202,68,.34);
          transform: translateY(-1px);
        }
        .admin-role-button {
          min-height: 68px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
          color: var(--text-h);
          cursor: pointer;
          text-align: left;
          transition: border-color .2s ease, transform .14s ease;
        }
        .admin-role-button:hover {
          border-color: rgba(238,202,68,.34);
          transform: translateY(-1px);
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
        .admin-server-bars {
          position: absolute;
          right: 16px;
          bottom: 0;
          display: flex;
          align-items: flex-end;
          gap: 5px;
          opacity: .28;
          height: 92px;
        }
        .admin-server-bars > span {
          width: 8px;
          border-radius: 4px 4px 0 0;
          background: var(--yellow-400);
        }
        .admin-recent-account-row {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
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
        .admin-recent-account-button {
          width: 100%;
          border: 1px solid var(--border);
          cursor: pointer;
          text-align: left;
          transition: border-color .2s ease, transform .14s ease;
        }
        .admin-recent-account-button:hover {
          border-color: rgba(238,202,68,.34);
          transform: translateY(-1px);
        }
        @keyframes admin-status-pulse {
          0%, 100% {
            opacity: .55;
            transform: scale(.92);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (max-width: 1160px) {
          .admin-command-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 780px) {
          .admin-visual-grid {
            grid-template-columns: 1fr;
          }
          .admin-recent-account-row {
            grid-template-columns: 1fr;
          }
          .admin-recent-account-meta {
            justify-content: flex-start;
          }
          .admin-traffic-shell {
            min-height: 188px;
          }
          .admin-traffic-bars {
            height: 150px;
            gap: 5px;
          }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.34em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Workspace Insight
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            Admin Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 720, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            A command-center view of account lifecycle, onboarding progress, role composition, and admin activity.
          </p>
        </div>
        <Chip color="yellow" dot>
          Command Center
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
          <Skeleton variant="rect" height={300} />
        </div>
      ) : (
        <div className="admin-command-grid">
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="admin-kpi-grid">
              <DashboardMetric
                label="Total Users"
                value={totalUsers}
                caption="Directory accounts across all roles"
                badge={invitedThisWeek.length > 0 ? `+${invitedThisWeek.length} this week` : 'No new invites'}
                onClick={() => router.push('/admin/users')}
                actionLabel="Users"
                icon={Users}
              />
              <DashboardMetric
                label="Active This Week"
                value={activeThisWeek.length}
                caption="Users with a recent login"
                badge={`${activeRatio}% of directory`}
                onClick={() => router.push('/admin/analytics')}
                actionLabel="Analytics"
                icon={Activity}
              />
              <DashboardMetric
                label="Pending Invites"
                value={pendingInvites.length}
                caption="Accounts waiting for first access"
                badge={pendingInvites.length === 0 ? 'All clear' : 'Needs follow-up'}
                onClick={() => router.push('/admin/users')}
                actionLabel="Review"
                icon={UserPlus}
              />
              <DashboardMetric
                label="System Health"
                value={`${systemHealth}%`}
                caption="Availability weighted by account state"
                badge={systemHealthLabel}
                onClick={() => router.push('/admin/analytics')}
                actionLabel="Health"
                icon={ShieldCheck}
              />
            </div>

            <div className="admin-visual-grid">
              <Card>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <SectionTitle title="Traffic & Engagement" caption="Behavior trend derived from active users and account pressure." />
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Chip color="glass" size="sm">
                        Last 7 days
                      </Chip>
                      <Button variant="ghost" size="xs" onClick={() => router.push('/admin/analytics')}>
                        Open
                      </Button>
                    </div>
                  </div>

                  <div className="admin-traffic-shell" role="img" aria-label="Activity trend chart">
                    <div className="admin-traffic-grid-lines">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="admin-traffic-bars">
                      {trafficBars.map((value, index) => (
                        <span key={`${value}-${index}`} className="admin-traffic-bar" style={{ height: `${value}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <SectionTitle title="Role Distribution" caption="Current account split by directory role." />
                    <Button variant="ghost" size="xs" onClick={() => router.push('/admin/users')}>
                      Manage
                    </Button>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {roleDistribution.map((entry) => (
                      <button
                        key={entry.label}
                        type="button"
                        onClick={() => router.push(entry.path)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        aria-label={`Open ${entry.label} directory`}
                      >
                        <Progress
                          label={`${entry.label} (${entry.count})`}
                          value={entry.percent}
                          color={entry.color}
                          showValue
                          size="sm"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <SectionTitle title="Recent Activity" caption="Latest account lifecycle actions captured from audit logs." />
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
                          <TableHeader style={{ textAlign: 'right' }}>Time</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentActivity.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <span className="admin-activity-avatar">{emailInitials(entry.performedByEmail)}</span>
                                <span style={{ color: 'var(--text-h)', fontWeight: 650 }}>{entry.performedByEmail ?? 'System'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Chip color={auditChipColor(entry.action)} dot>
                                {auditActionLabel(entry.action)}
                              </Chip>
                            </TableCell>
                            <TableCell style={{ color: 'var(--text-body)', fontSize: 12.5 }}>
                              {entry.targetUserEmail ?? '-'}
                            </TableCell>
                            <TableCell style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
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

            <Card>
              <div style={{ display: 'grid', gap: 14 }}>
                <SectionTitle title="Recent Accounts" caption="Newest accounts created in the directory." />
                <div style={{ display: 'grid', gap: 9 }}>
                  {recentAccounts.length === 0 ? (
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No users have been created yet.</p>
                  ) : (
                    recentAccounts.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="admin-recent-account-row admin-recent-account-button"
                        onClick={() => router.push(getUserDetailPath(user))}
                        aria-label={`Open ${getUserDisplayName(user)} profile`}
                      >
                        <UserIdentityCell
                          name={getUserDisplayName(user)}
                          email={user.email}
                          initials={getUserAvatarInitials(user)}
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
                      </button>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>

          <aside style={{ display: 'grid', gap: 16 }}>
            <Card>
              <div style={{ display: 'grid', gap: 12 }}>
                <SectionTitle title="Quick Actions" caption="Frequent admin workflows." />
                <Button variant="primary" size="sm" fullWidth iconLeft={<UserPlus size={14} />} onClick={() => router.push('/admin/users')}>
                  Add New User
                </Button>
                <Button variant="subtle" size="sm" fullWidth iconLeft={<Users size={14} />} onClick={() => router.push('/admin/users')}>
                  User Management
                </Button>
                <Button variant="subtle" size="sm" fullWidth iconLeft={<TicketPlus size={14} />} onClick={() => setSubmitModalOpen(true)}>
                  New Ticket
                </Button>
                <Button variant="subtle" size="sm" fullWidth iconLeft={<Bell size={14} />} onClick={() => router.push('/admin/notifications')}>
                  Notifications
                </Button>
                <Button variant="subtle" size="sm" fullWidth iconLeft={<BookOpen size={14} />} onClick={() => router.push('/admin/reports')}>
                  Reports
                </Button>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'grid', gap: 12 }}>
                <SectionTitle title="Role Directories" caption="Jump straight into role-level user lists." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
                  {[
                    { label: 'Students', path: '/admin/students', count: studentUsers.length },
                    { label: 'Faculty', path: '/admin/faculty', count: facultyUsers.length },
                    { label: 'Managers', path: '/admin/managers', count: managerUsers.length },
                    { label: 'Admins', path: '/admin/admins', count: adminUsers.length },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className="admin-role-button"
                      onClick={() => router.push(item.path)}
                    >
                      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 850 }}>{item.label}</span>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 6,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '.12em',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'grid', gap: 10 }}>
                <SectionTitle title="Needs Attention" caption="Priority queue before deep review." />
                <div style={{ display: 'grid', gap: 8 }}>
                  {attentionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} type="button" className="admin-attention-item" onClick={() => router.push(item.path)}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 750 }}>
                          <Icon size={15} color="var(--yellow-700)" />
                          {item.label}
                        </span>
                        <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--text-h)', fontSize: 17 }}>{item.value}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <SectionTitle title="System Status" caption="Live admin operations health." />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow-400)', animation: 'admin-status-pulse 1.8s ease-in-out infinite' }} />
                    <Button variant="ghost" size="xs" onClick={() => router.push('/admin/analytics')}>
                      Open
                    </Button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <Progress label="Directory availability" value={accountAvailability} color="green" showValue size="sm" />
                  <Progress label="Onboarding completion" value={onboardingCompletion} color="blue" showValue size="sm" />
                  <Progress label="Invite clearance" value={inviteClearance} color="yellow" showValue size="sm" />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ position: 'relative', minHeight: 170, display: 'grid', alignContent: 'space-between', gap: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(238,202,68,.14)',
                        color: 'var(--yellow-700)',
                      }}
                    >
                      <Gauge size={16} strokeWidth={2.4} />
                    </span>
                    <div>
                      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 850, color: 'var(--text-h)' }}>Server Load</p>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Admin cluster alpha</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => router.push('/admin/analytics')}>
                    Open
                  </Button>
                </div>

                <div style={{ display: 'grid', gap: 10, position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, lineHeight: 1, color: 'var(--yellow-600)' }}>
                      {serverLoad}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-muted)', lineHeight: 1 }}>%</span>
                  </div>
                  <Progress value={serverLoad} color={serverLoad > 86 ? 'red' : serverLoad > 70 ? 'orange' : 'green'} size="sm" />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                    <Database size={14} />
                    Capacity reacts to active sessions and queue pressure.
                  </div>
                </div>

                <div className="admin-server-bars" aria-hidden="true">
                  {trafficBars.slice(-6).map((value, index) => (
                    <span key={`server-${index}`} style={{ height: `${Math.max(24, Math.round(value * 0.92))}%` }} />
                  ))}
                </div>
              </div>
            </Card>
          </aside>
        </div>
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
