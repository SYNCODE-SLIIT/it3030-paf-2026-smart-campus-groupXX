'use client';

import React from 'react';

import { Alert } from '@/components/ui';

type BookingAlertProps = React.ComponentProps<typeof Alert>;

const bookingAlertStyles: Record<BookingAlertProps['variant'], React.CSSProperties> = {
  error: {
    background: 'color-mix(in srgb, var(--surface-2) 84%, var(--red-400))',
    border: '1px solid color-mix(in srgb, var(--red-400) 34%, transparent)',
    borderLeft: '3px solid var(--red-400)',
    color: 'var(--text-h)',
  },
  success: {
    background: 'color-mix(in srgb, var(--surface-2) 84%, var(--green-400))',
    border: '1px solid color-mix(in srgb, var(--green-400) 34%, transparent)',
    borderLeft: '3px solid var(--green-400)',
    color: 'var(--text-h)',
  },
  warning: {
    background: 'color-mix(in srgb, var(--surface-2) 84%, var(--orange-400))',
    border: '1px solid color-mix(in srgb, var(--orange-400) 34%, transparent)',
    borderLeft: '3px solid var(--orange-400)',
    color: 'var(--text-h)',
  },
  info: {
    background: 'color-mix(in srgb, var(--surface-2) 84%, var(--blue-400))',
    border: '1px solid color-mix(in srgb, var(--blue-400) 34%, transparent)',
    borderLeft: '3px solid var(--blue-400)',
    color: 'var(--text-h)',
  },
  neutral: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid var(--border-strong)',
    color: 'var(--text-h)',
  },
};

export function BookingAlert({ variant, style, ...props }: BookingAlertProps) {
  return (
    <Alert
      variant={variant}
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.03)',
        ...bookingAlertStyles[variant],
        ...style,
      }}
      {...props}
    />
  );
}
