'use client';

import React from 'react';
import { ArrowRight, BookOpen, CalendarClock, CheckCircle, Plus, TicketPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { DonutChart } from '@/components/charts';
import { SubmitTicketModal } from '@/components/tickets';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import { getErrorMessage, listMyBookings, listMyTickets } from '@/lib/api-client';
import type { BookingResponse, BookingStatus, TicketPriority, TicketStatus, TicketSummaryResponse } from '@/lib/api-types';

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'neutral',
  CHECKED_IN: 'blue',
  COMPLETED: 'neutral',
  NO_SHOW: 'orange',
} as const;

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CHECKED_IN: 'Checked In',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
};

const TICKET_STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: 'blue',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'neutral',
  REJECTED: 'red',
} as const;

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  URGENT: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'neutral',
} as const;

function StatCard({
  title,
  value,
  detail,
  icon,
  onClick,
  loading,
}: {
  title: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: '100%', padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
      aria-label={`Open ${title}`}
    >
      <Card hoverable style={{ height: '100%' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {title}
              </p>
              {loading ? (
                <Skeleton style={{ width: 60, height: 36, marginTop: 10, borderRadius: 8 }} />
              ) : (
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, lineHeight: 1, color: 'var(--text-h)' }}>
                  {value}
                </p>
              )}
            </div>
            <span style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--surface-2)', color: 'var(--blue-600)', flexShrink: 0 }}>
              {icon}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6 }}>{detail}</p>
        </div>
      </Card>
    </button>
  );
}

function SectionHeader({ title, viewAllHref, onViewAll }: { title: string; viewAllHref: string; onViewAll: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-h)' }}>{title}</h2>
      <button
        type="button"
        onClick={onViewAll}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--blue-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
        aria-label={`View all — ${viewAllHref}`}
      >
        View all <ArrowRight size={13} />
      </button>
    </div>
  );
}

function EmptyRow({ message, cta, onCta }: { message: string; cta: string; onCta: () => void }) {
  return (
    <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{message}</p>
      <Button variant="ghost-accent" size="sm" onClick={onCta}>
        {cta}
      </Button>
    </div>
  );
}

export function StudentDashboardScreen() {
  const router = useRouter();
  const { session, appUser } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.access_token ?? null;

  const [bookings, setBookings] = React.useState<BookingResponse[]>([]);
  const [tickets, setTickets] = React.useState<TicketSummaryResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitModalOpen, setSubmitModalOpen] = React.useState(false);

  const firstName = appUser?.studentProfile?.firstName ?? appUser?.email?.split('@')[0] ?? 'there';

  const load = React.useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [b, t] = await Promise.all([listMyBookings(accessToken), listMyTickets(accessToken)]);
      setBookings(b);
      setTickets(t);
    } catch (err) {
      showToast('error', 'Could not load dashboard', getErrorMessage(err, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, showToast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Derived stats
  const activeBookings = bookings.filter((b) => b.status === 'PENDING' || b.status === 'APPROVED');
  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');

  const upcomingBookings = [...activeBookings]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 4);

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Donut chart data
  const bookingStatuses: BookingStatus[] = ['PENDING', 'APPROVED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'];
  const bookingDonutColors: Record<BookingStatus, string> = {
    PENDING: 'var(--yellow-400)',
    APPROVED: 'var(--green-400)',
    CHECKED_IN: 'var(--blue-400)',
    COMPLETED: 'var(--neutral-400)',
    CANCELLED: 'var(--neutral-300)',
    REJECTED: 'var(--red-400)',
    NO_SHOW: 'var(--orange-400)',
  };
  const bookingDonutData = bookingStatuses
    .map((s) => ({ label: BOOKING_STATUS_LABEL[s], value: bookings.filter((b) => b.status === s).length, color: bookingDonutColors[s] }))
    .filter((d) => d.value > 0);

  const ticketStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
  const ticketDonutColors: Record<TicketStatus, string> = {
    OPEN: 'var(--blue-400)',
    IN_PROGRESS: 'var(--yellow-400)',
    RESOLVED: 'var(--green-400)',
    CLOSED: 'var(--neutral-400)',
    REJECTED: 'var(--red-400)',
  };
  const ticketDonutData = ticketStatuses
    .map((s) => ({ label: TICKET_STATUS_LABEL[s], value: tickets.filter((t) => t.status === s).length, color: ticketDonutColors[s] }))
    .filter((d) => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <style>{`
        .student-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .student-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 960px) { .student-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) {
          .student-grid { grid-template-columns: 1fr; }
          .student-two-col { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Greeting */}
      <div>
        <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Student Dashboard
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--text-h)' }}>
          {getGreeting()}, {firstName}
        </h1>
      </div>

      {/* Stat cards */}
      <div className="student-grid">
        <StatCard
          title="Active Bookings"
          value={activeBookings.length}
          detail="Pending or approved bookings"
          icon={<CalendarClock size={20} />}
          onClick={() => router.push('/students/bookings')}
          loading={loading}
        />
        <StatCard
          title="Open Tickets"
          value={openTickets.length}
          detail="Tickets awaiting resolution"
          icon={<TicketPlus size={20} />}
          onClick={() => router.push('/students/tickets')}
          loading={loading}
        />
        <StatCard
          title="Completed Bookings"
          value={completedBookings.length}
          detail="All-time completed sessions"
          icon={<CheckCircle size={20} />}
          onClick={() => router.push('/students/bookings')}
          loading={loading}
        />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" onClick={() => router.push('/book/resource')} iconLeft={<BookOpen size={15} />}>
          Book a Resource
        </Button>
        <Button variant="ghost-accent" size="sm" onClick={() => setSubmitModalOpen(true)} iconLeft={<Plus size={15} />}>
          Report an Issue
        </Button>
      </div>

      {/* Upcoming bookings + Recent tickets */}
      <div className="student-two-col">
        {/* Upcoming bookings */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader title="Upcoming Bookings" viewAllHref="/students/bookings" onViewAll={() => router.push('/students/bookings')} />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((n) => <Skeleton key={n} style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <EmptyRow message="No upcoming bookings." cta="Book a Resource" onCta={() => router.push('/book/resource')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}
                >
                  <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.resource.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
                    </span>
                  </div>
                  <Chip color={BOOKING_STATUS_COLOR[b.status] as never} size="sm">
                    {BOOKING_STATUS_LABEL[b.status]}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent tickets */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHeader title="Recent Tickets" viewAllHref="/students/tickets" onViewAll={() => router.push('/students/tickets')} />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((n) => <Skeleton key={n} style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : recentTickets.length === 0 ? (
            <EmptyRow message="No tickets submitted yet." cta="Report an Issue" onCta={() => setSubmitModalOpen(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => router.push(`/students/tickets/${t.ticketCode}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)', background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer', textAlign: 'left', width: '100%', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--border)' }}
                >
                  <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {t.ticketCode}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Chip color={PRIORITY_COLOR[t.priority] as never} size="sm">{t.priority}</Chip>
                    <Chip color={TICKET_STATUS_COLOR[t.status] as never} size="sm">{TICKET_STATUS_LABEL[t.status]}</Chip>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Analytics */}
      {!loading && (bookings.length > 0 || tickets.length > 0) && (
        <div className="student-two-col">
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-h)' }}>Bookings Breakdown</h2>
            {bookingDonutData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <DonutChart data={bookingDonutData} size={120} thickness={18} centerValue={bookings.length} centerLabel="total" showLegend={false} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 0 }}>
                  {bookingDonutData.map((d) => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-body)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)', flexShrink: 0 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No bookings yet.</p>
            )}
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-h)' }}>Tickets Breakdown</h2>
            {ticketDonutData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <DonutChart data={ticketDonutData} size={120} thickness={18} centerValue={tickets.length} centerLabel="total" showLegend={false} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 0 }}>
                  {ticketDonutData.map((d) => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-body)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)', flexShrink: 0 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No tickets yet.</p>
            )}
          </Card>
        </div>
      )}

      <SubmitTicketModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={() => {
          setSubmitModalOpen(false);
          void load();
        }}
      />
    </div>
  );
}
