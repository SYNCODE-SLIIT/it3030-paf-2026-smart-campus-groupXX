'use client';

import React from 'react';
import { CalendarClock, MessageSquareText, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button, Card, Chip } from '@/components/ui';

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Card hoverable>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--text-h)' }}>
        {value}
      </p>
      <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
        {caption}
      </p>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  cta: string;
  onClick: () => void;
}) {
  return (
    <Card hoverable>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(238,202,68,.14)',
              color: 'var(--yellow-700)',
              flexShrink: 0,
            }}
          >
            <Icon size={18} strokeWidth={2.2} />
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
            {title}
          </div>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
          {description}
        </p>
        <div>
          <Button variant="subtle" size="sm" onClick={onClick}>
            {cta}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function BookingManagerDashboardScreen() {
  const router = useRouter();

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Manager Workspace
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-h)' }}>
            Booking Manager Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 720, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Review booking approvals, stay close to scheduling work, and raise operational issues without leaving the booking workspace.
          </p>
        </div>
        <Chip color="green" dot>Booking Manager</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        <SummaryCard label="Access" value="Role Based" caption="This workspace is limited to active booking managers." />
        <SummaryCard label="Requests" value="Bookings" caption="Approvals, rejections, and check-in oversight remain the primary queue." />
        <SummaryCard label="Support" value="Tickets" caption="Booking-related issues can be reported and tracked from a dedicated requester flow." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        <ActionCard
          title="Booking Queue"
          description="Open the booking operations screen for approvals, modifications, and check-in management."
          icon={CalendarClock}
          cta="Open Bookings"
          onClick={() => router.push('/booking-managers/bookings')}
        />
        <ActionCard
          title="Support Tickets"
          description="Create and track booking-related support tickets using the shared requester ticket experience."
          icon={MessageSquareText}
          cta="Open Tickets"
          onClick={() => router.push('/booking-managers/tickets')}
        />
        <ActionCard
          title="Operational Focus"
          description="Use tickets for incidents and defects, while leaving approvals and scheduling decisions in the booking queue."
          icon={ClipboardList}
          cta="View Booking Workflow"
          onClick={() => router.push('/booking-managers/bookings')}
        />
      </div>
    </div>
  );
}
