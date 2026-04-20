'use client';

import React from 'react';
import { X } from 'lucide-react';

type ToastVariant = 'error' | 'success' | 'warning' | 'info' | 'neutral';

interface ToastStackProps {
  children: React.ReactNode;
}

interface ToastProps {
  variant: ToastVariant;
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; color: string; glow: string }> = {
  error: {
    bg: 'var(--red-50)',
    border: 'var(--red-400)',
    color: 'var(--red-700)',
    glow: 'rgba(230,53,40,.18)',
  },
  success: {
    bg: 'var(--green-50)',
    border: 'var(--green-400)',
    color: 'var(--green-700)',
    glow: 'rgba(20,164,87,.16)',
  },
  warning: {
    bg: 'var(--orange-50)',
    border: 'var(--orange-400)',
    color: 'var(--orange-700)',
    glow: 'rgba(212,121,30,.16)',
  },
  info: {
    bg: 'var(--blue-50)',
    border: 'var(--blue-400)',
    color: 'var(--blue-700)',
    glow: 'rgba(43,109,232,.16)',
  },
  neutral: {
    bg: 'var(--surface)',
    border: 'var(--border-strong)',
    color: 'var(--text-body)',
    glow: 'rgba(0,0,0,.12)',
  },
};

export function ToastStack({ children }: ToastStackProps) {
  const items = React.Children.toArray(children).filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="smart-toast-stack" aria-live="polite" aria-atomic="false">
      <style>{`
        .smart-toast-stack {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 120;
          width: min(420px, calc(100vw - 48px));
          display: grid;
          gap: 10px;
          pointer-events: none;
        }
        .smart-toast {
          animation: smart-toast-in .18s ease-out both;
        }
        @keyframes smart-toast-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          .smart-toast-stack {
            bottom: 16px;
            right: 10px;
            width: calc(100vw - 20px);
          }
        }
      `}</style>
      {items}
    </div>
  );
}

export function Toast({
  variant,
  title,
  icon,
  actions,
  dismissible = false,
  onDismiss,
  children,
}: ToastProps) {
  const { bg, border, color, glow } = variantStyles[variant];

  return (
    <div
      className="smart-toast"
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      style={{
        pointerEvents: 'auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 14,
        alignItems: 'center',
        padding: '16px 18px',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid color-mix(in srgb, ${border} 38%, var(--border))`,
        borderLeft: `4px solid ${border}`,
        background: bg,
        color,
        boxShadow: `0 20px 46px ${glow}, var(--card-shadow)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
        {icon && <span style={{ display: 'flex', flexShrink: 0, marginTop: 2, color }}>{icon}</span>}
        <div style={{ minWidth: 0 }}>
          {title && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 850,
                color,
                lineHeight: 1.25,
              }}
            >
              {title}
            </p>
          )}
          <div style={{ marginTop: title ? 6 : 0, fontSize: 13.5, lineHeight: 1.55, color }}>
            {children}
          </div>
        </div>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {actions}
        {dismissible && (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={onDismiss}
            style={{
              width: 30,
              height: 30,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '50%',
              background: 'transparent',
              color,
              cursor: 'pointer',
              opacity: 0.68,
              flexShrink: 0,
            }}
          >
            <X size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
