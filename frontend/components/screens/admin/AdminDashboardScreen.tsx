'use client';

import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  ShieldCheck,
  Ticket,
  TicketPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { SubmitTicketModal } from '@/components/tickets';
import { Alert, Button, Card, Chip, Skeleton } from '@/components/ui';
import { getAdminDashboard, getErrorMessage } from '@/lib/api-client';
import type { AdminDashboardResponse, DashboardQuickLink } from '@/lib/api-types';

function SummaryCard({
  title,
  value,
  detail,
  icon,
  onClick,
}: {
  title: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
      }}
      aria-label={`Open ${title}`}
    >
      <Card hoverable style={{ height: '100%' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {title}
              </p>
              <p
                style={{
                  margin: '10px 0 0',
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: 'var(--text-h)',
                }}
              >
                {value}
              </p>
            </div>
            <span
              style={{
                width: 40,
                height: 40,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: 'var(--surface-2)',
                color: 'var(--yellow-700)',
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>{detail}</p>
        </div>
      </Card>
    </button>
  );
}

function QuickLinkTile({
  link,
  onClick,
}: {
  link: DashboardQuickLink;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-2)',
        padding: 14,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span style={{ display: 'grid', gap: 4 }}>
        <span style={{ color: 'var(--text-h)', fontSize: 14, fontWeight: 800 }}>{link.label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>{link.description}</span>
      </span>
      <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        padding: '10px 0',
        borderTop: '1px solid rgba(0,0,0,.06)',
      }}
    >
      <span style={{ color: 'var(--text-body)', fontSize: 13 }}>{label}</span>
      <strong style={{ color: 'var(--text-h)' }}>{value}</strong>
    </div>
  );
}

export function AdminDashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [dashboard, setDashboard] = React.useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = React.useState(false);

  const reloadDashboard = React.useCallback(async () => {
    if (!accessToken) {
      setDashboard(null);
      setLoading(false);
      setError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextDashboard = await getAdminDashboard(accessToken);
      setDashboard(nextDashboard);
    } catch (loadError) {
      setDashboard(null);
      setError(getErrorMessage(loadError, 'We could not load the admin dashboard right now.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void reloadDashboard();
  }, [reloadDashboard]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }
        .admin-span-12 { grid-column: span 12; }
        .admin-span-6 { grid-column: span 6; }
        .admin-span-4 { grid-column: span 4; }
        .admin-span-3 { grid-column: span 3; }
        .admin-list {
          display: grid;
          gap: 10px;
        }
        @media (max-width: 1180px) {
          .admin-span-3,
          .admin-span-4,
          .admin-span-6 {
            grid-column: span 6;
          }
        }
        @media (max-width: 780px) {
          .admin-span-3,
          .admin-span-4,
          .admin-span-6 {
            grid-column: span 12;
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
              letterSpacing: '.35em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Admin Console
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
            Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 720, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            A fast admin overview for people, bookings, tickets, resources, and next actions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip color="yellow" dot>
            Lightweight Summary
          </Chip>
          <Button variant="subtle" size="sm" onClick={() => void reloadDashboard()}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" iconLeft={<TicketPlus size={14} />} onClick={() => setSubmitModalOpen(true)}>
            New Ticket
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Dashboard unavailable">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="admin-dashboard-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`metric-skeleton-${index}`} className="admin-span-3">
              <Skeleton variant="rect" height={124} />
            </div>
          ))}
          <div className="admin-span-6">
            <Skeleton variant="rect" height={260} />
          </div>
          <div className="admin-span-6">
            <Skeleton variant="rect" height={260} />
          </div>
          <div className="admin-span-4">
            <Skeleton variant="rect" height={300} />
          </div>
          <div className="admin-span-4">
            <Skeleton variant="rect" height={300} />
          </div>
          <div className="admin-span-4">
            <Skeleton variant="rect" height={300} />
          </div>
        </div>
      ) : dashboard ? (
        <div className="admin-dashboard-grid">
          <div className="admin-span-3">
            <SummaryCard
              title="Users"
              value={dashboard.totalUsers}
              detail={`${dashboard.activeThisWeek} active in the last 7 days`}
              icon={<Users size={18} strokeWidth={2.2} />}
              onClick={() => router.push('/admin/users')}
            />
          </div>
          <div className="admin-span-3">
            <SummaryCard
              title="Open Tickets"
              value={dashboard.openTickets}
              detail={`${dashboard.inProgressTickets} currently in progress`}
              icon={<Ticket size={18} strokeWidth={2.2} />}
              onClick={() => router.push('/admin/tickets')}
            />
          </div>
          <div className="admin-span-3">
            <SummaryCard
              title="Pending Bookings"
              value={dashboard.pendingBookings}
              detail={`${dashboard.approvedBookings} approved or checked in`}
              icon={<CalendarClock size={18} strokeWidth={2.2} />}
              onClick={() => router.push('/admin/bookings')}
            />
          </div>
          <div className="admin-span-3">
            <SummaryCard
              title="Unread Notifications"
              value={dashboard.unreadNotifications}
              detail="Notifications waiting for review"
              icon={<Bell size={18} strokeWidth={2.2} />}
              onClick={() => router.push('/admin/notifications')}
            />
          </div>

          <div className="admin-span-6">
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
                    Quick Actions
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
                    Go straight into the admin areas that need attention.
                  </p>
                </div>
                <div className="admin-list">
                  {dashboard.quickLinks.map((link) => (
                    <QuickLinkTile key={link.href} link={link} onClick={() => router.push(link.href)} />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="admin-span-6">
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
                    Account Health
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
                    High-level user lifecycle counts without loading the full directory.
                  </p>
                </div>
                <div>
                  <StatRow label="Active accounts" value={dashboard.activeUsers} />
                  <StatRow label="Invited accounts" value={dashboard.invitedUsers} />
                  <StatRow label="Suspended accounts" value={dashboard.suspendedUsers} />
                  <StatRow label="Student accounts" value={dashboard.studentUsers} />
                  <StatRow label="Faculty accounts" value={dashboard.facultyUsers} />
                  <StatRow label="Manager and admin accounts" value={dashboard.managerUsers + dashboard.adminUsers} />
                </div>
              </div>
            </Card>
          </div>

          <div className="admin-span-4">
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
                    User Roles
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
                    Current distribution across campus account types.
                  </p>
                </div>
                <div>
                  <StatRow label="Students" value={dashboard.studentUsers} />
                  <StatRow label="Faculty" value={dashboard.facultyUsers} />
                  <StatRow label="Managers" value={dashboard.managerUsers} />
                  <StatRow label="Admins" value={dashboard.adminUsers} />
                </div>
                <Button variant="subtle" size="sm" iconLeft={<ShieldCheck size={14} />} onClick={() => router.push('/admin/users')}>
                  Open User Management
                </Button>
              </div>
            </Card>
          </div>

          <div className="admin-span-4">
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
                    Resources
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
                    Availability and maintenance posture for the catalog.
                  </p>
                </div>
                <div>
                  <StatRow label="Total resources" value={dashboard.totalResources} />
                  <StatRow label="Active resources" value={dashboard.activeResources} />
                  <StatRow label="Maintenance" value={dashboard.maintenanceResources} />
                  <StatRow label="Out of service" value={dashboard.outOfServiceResources} />
                </div>
                <Button variant="subtle" size="sm" iconLeft={<Wrench size={14} />} onClick={() => router.push('/admin/resources')}>
                  Open Resources
                </Button>
              </div>
            </Card>
          </div>

          <div className="admin-span-4">
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 850, color: 'var(--text-h)' }}>
                    Campus Setup
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>
                    Buildings, catalogue structure, and related admin areas.
                  </p>
                </div>
                <div>
                  <StatRow label="Total buildings" value={dashboard.totalBuildings} />
                  <StatRow label="Active buildings" value={dashboard.activeBuildings} />
                  <StatRow label="Approved bookings" value={dashboard.approvedBookings} />
                  <StatRow label="Open tickets" value={dashboard.openTickets + dashboard.inProgressTickets} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="subtle" size="sm" iconLeft={<Building2 size={14} />} onClick={() => router.push('/admin/buildings')}>
                    Buildings
                  </Button>
                  <Button variant="subtle" size="sm" iconLeft={<BookOpen size={14} />} onClick={() => router.push('/admin/analytics')}>
                    Analytics
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Alert variant="warning" title="No dashboard data">
          The admin dashboard returned no data. Try refreshing once the backend finishes starting.
        </Alert>
      )}

      <SubmitTicketModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={() => {
          void reloadDashboard();
          showToast('success', 'Ticket submitted', 'Your support ticket has been created.');
        }}
      />
    </div>
  );
}
