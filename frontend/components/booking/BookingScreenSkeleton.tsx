'use client';

import React from 'react';

import { Card, Skeleton, Tabs } from '@/components/ui';
import { BookingCardSkeleton, BookingSection } from '@/components/booking/BookingCard';

interface BookingScreenSkeletonProps {
  variant?: 'requester' | 'manager';
}

function StatSkeletonCards({ count }: { count: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} style={{ padding: 20 }}>
          <Skeleton variant="line" height={10} width="55%" />
          <div style={{ height: 12 }} />
          <Skeleton variant="line" height={30} width="35%" />
        </Card>
      ))}
    </div>
  );
}

function SectionSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <BookingSection key={sectionIndex} label="Loading" color="var(--border)" count={3}>
          {Array.from({ length: 3 }).map((__, cardIndex) => (
            <div key={cardIndex} style={{ flexShrink: 0 }}>
              <BookingCardSkeleton />
            </div>
          ))}
        </BookingSection>
      ))}
    </div>
  );
}

export function BookingScreenSkeleton({ variant = 'requester' }: BookingScreenSkeletonProps) {
  const isManager = variant === 'manager';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <Skeleton variant="line" height={10} width="18%" />
        <Skeleton variant="line" height={36} width="34%" />
        <Skeleton variant="line" height={14} width="56%" />
      </div>

      <StatSkeletonCards count={isManager ? 4 : 4} />

      <Tabs
        variant="pill"
        tabs={isManager
          ? [
              { label: 'Bookings', value: 'bookings', badge: 0 },
              { label: 'Modifications', value: 'modifications', badge: 0 },
              { label: 'Check-Ins', value: 'checkins', badge: 0 },
            ]
          : [
              { label: 'My Bookings', value: 'bookings', badge: 0 },
              { label: 'Recurring', value: 'recurring', badge: 0 },
              { label: 'Calendar', value: 'calendar' },
              { label: 'Notifications', value: 'notifications', badge: 0 },
            ]}
        value={isManager ? 'bookings' : 'bookings'}
        onChange={() => {}}
      />

      {!isManager && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.95fr)', gap: 16 }}>
          <Card style={{ padding: 20, display: 'grid', gap: 12 }}>
            <Skeleton variant="line" height={16} width="30%" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <Skeleton variant="rect" height={44} />
              <Skeleton variant="rect" height={44} />
              <Skeleton variant="rect" height={44} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <Skeleton variant="rect" height={44} />
              <Skeleton variant="rect" height={44} />
              <Skeleton variant="rect" height={44} />
            </div>
            <Skeleton variant="rect" height={96} />
          </Card>
          <Card style={{ padding: 20, display: 'grid', gap: 12 }}>
            <Skeleton variant="line" height={16} width="46%" />
            <Skeleton variant="line" height={12} width="74%" />
            <Skeleton variant="rect" height={32} />
            <Skeleton variant="rect" height={32} />
          </Card>
        </div>
      )}

      {isManager && (
        <Card style={{ padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <Skeleton variant="rect" height={42} />
            <Skeleton variant="rect" height={42} />
            <Skeleton variant="rect" height={42} />
            <Skeleton variant="rect" height={42} />
          </div>
        </Card>
      )}

      <SectionSkeleton sections={2} />
    </div>
  );
}
