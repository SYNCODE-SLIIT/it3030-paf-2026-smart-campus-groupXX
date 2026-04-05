'use client';

import React from 'react';

type AlertVariant = 'error' | 'success' | 'warning' | 'info' | 'neutral';

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; color: string }> = {
  error:   { bg: 'var(--red-50)',    border: 'var(--red-400)',          color: 'var(--red-700)'    },
  success: { bg: 'var(--green-50)',  border: 'var(--green-400)',        color: 'var(--green-700)'  },
  warning: { bg: 'var(--orange-50)', border: 'var(--orange-400)',       color: 'var(--orange-700)' },
  info:    { bg: 'var(--blue-50)',   border: 'var(--blue-400)',         color: 'var(--blue-700)'   },
  neutral: { bg: 'var(--surface-2)', border: 'var(--border-strong)',    color: 'var(--text-body)'  },
};

export function Alert({
  variant,
  title,
  icon,
  dismissible = false,
  onDismiss,
  children,
  className = '',
  style,
}: AlertProps) {
  const { bg, border, color } = variantStyles[variant];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        borderLeft: `3px solid ${border}`,
        background: bg,
        color,
        fontSize: 13.5,
        lineHeight: 1.55,
        transition: 'background .3s',
        ...style,
      }}
    >
      {icon && (
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      )}
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              marginBottom: 2,
            }}
          >
            {title}
          </div>
        )}
        {children}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 16,
            cursor: 'pointer',
            flexShrink: 0,
            opacity: 0.5,
            transition: 'opacity .15s',
            lineHeight: 1,
            padding: 0,
            color: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
