'use client';

import React from 'react';

import { Card, Skeleton } from '@/components/ui';

interface BookingScreenSkeletonProps {
  variant?: 'requester' | 'manager';
}

function StatSkeletonCards({ count }: { count: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          style={{
            padding: 20,
            border: '1px solid color-mix(in srgb, var(--border) 74%, transparent)',
            boxShadow: '0 16px 36px rgba(10, 24, 58, 0.08)',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 92%, #ffffff 8%), color-mix(in srgb, var(--bg-card) 97%, #e3ebff 3%))',
          }}
        >
          <Skeleton variant="line" height={10} width="55%" />
          <div style={{ height: 12 }} />
          <Skeleton variant="line" height={30} width="35%" />
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card
      style={{
        padding: 20,
        border: '1px solid color-mix(in srgb, var(--border) 74%, transparent)',
        boxShadow: '0 16px 40px rgba(10, 24, 58, 0.08)',
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 93%, #ffffff 7%), color-mix(in srgb, var(--bg-card) 97%, #e9f0ff 3%))',
      }}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Skeleton variant="line" height={18} width="28%" />
        <div style={{ display: 'grid', gap: 10 }}>
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 1fr 0.9fr',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <Skeleton variant="rect" height={54} />
              <Skeleton variant="rect" height={54} />
              <Skeleton variant="rect" height={54} />
              <Skeleton variant="rect" height={54} />
              <Skeleton variant="rect" height={36} width="80%" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function FilterSkeletonBar({ fields = 3 }: { fields?: number }) {
  return (
    <Card
      style={{
        padding: 20,
        border: '1px solid color-mix(in srgb, var(--border) 74%, transparent)',
        background: 'color-mix(in srgb, var(--bg-card) 96%, #f3f7ff 4%)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields}, minmax(0, 1fr))`, gap: 12 }}>
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} style={{ display: 'grid', gap: 8 }}>
            <Skeleton variant="line" height={10} width="40%" />
            <Skeleton variant="rect" height={42} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function BookingScreenSkeleton({ variant = 'requester' }: BookingScreenSkeletonProps) {
  const isManager = variant === 'manager';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: '22px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          background:
            'radial-gradient(circle at 88% -25%, rgba(52, 132, 255, 0.2), transparent 60%), linear-gradient(150deg, color-mix(in srgb, var(--bg-card) 92%, #ffffff 8%), color-mix(in srgb, var(--bg-card) 97%, #e5eeff 3%))',
        }}
      >
        <Skeleton variant="line" height={10} width="20%" />
        <Skeleton variant="line" height={36} width="38%" />
        <Skeleton variant="line" height={14} width="62%" />
      </div>

      <StatSkeletonCards count={isManager ? 4 : 2} />

      {isManager ? (
        <>
          <FilterSkeletonBar fields={3} />
          <TableSkeleton rows={5} />
        </>
      ) : (
        <>
          <Card
            style={{
              padding: 20,
              border: '1px solid color-mix(in srgb, var(--border) 74%, transparent)',
              boxShadow: '0 16px 40px rgba(10, 24, 58, 0.08)',
              background:
                'linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 92%, #ffffff 8%), color-mix(in srgb, var(--bg-card) 97%, #dce8ff 3%))',
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
                <Skeleton variant="rect" height={54} />
                <Skeleton variant="rect" height={54} />
                <Skeleton variant="rect" height={54} />
              </div>
              <Skeleton variant="rect" height={96} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Skeleton variant="rect" height={40} width={140} />
              </div>
            </div>
          </Card>

          <Card
            style={{
              padding: 20,
              border: '1px solid color-mix(in srgb, var(--border) 74%, transparent)',
              boxShadow: '0 16px 40px rgba(10, 24, 58, 0.08)',
              background:
                'linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 93%, #ffffff 7%), color-mix(in srgb, var(--bg-card) 97%, #e9f0ff 3%))',
            }}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <Skeleton variant="line" height={18} width="30%" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} variant="rect" height={30} width={110} />
                ))}
              </div>
            </div>
          </Card>

          <TableSkeleton rows={4} />
        </>
      )}
    </div>
  );
}