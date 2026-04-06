'use client';

import React from 'react';

type ButtonVariant =
  | 'glass'
  | 'primary'
  | 'ghost'
  | 'ghost-accent'
  | 'subtle'
  | 'dark'
  | 'danger'
  | 'ghost-danger'
  | 'success'
  | 'info';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  xs: { height: 30, padding: '0 14px', borderRadius: 8,  fontSize: 9  },
  sm: { height: 36, padding: '0 18px', borderRadius: 10, fontSize: 10 },
  md: { height: 44, padding: '0 22px', borderRadius: 13, fontSize: 11 },
  lg: { height: 52, padding: '0 28px', borderRadius: 14, fontSize: 12 },
  xl: { height: 60, padding: '0 36px', borderRadius: 16, fontSize: 12 },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  glass: {
    background: 'rgba(238,202,68,.82)',
    color: 'var(--yellow-900)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(0,0,0,.12), 0 2px 10px rgba(238,202,68,.28), 0 1px 3px rgba(0,0,0,.15)',
  },
  primary: {
    background: 'var(--yellow-400)',
    color: 'var(--yellow-900)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.1), 0 2px 8px rgba(238,202,68,.3), 0 1px 3px rgba(0,0,0,.12)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ghost-text)',
  },
  'ghost-accent': {
    background: 'transparent',
    color: 'var(--yellow-600)',
    boxShadow: '0 0 0 1.5px rgba(238,202,68,.5)',
  },
  subtle: {
    background: 'var(--surface-2)',
    color: 'var(--text-body)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--chip-shadow)',
  },
  dark: {
    background: 'var(--neutral-950)',
    color: 'var(--neutral-100)',
    boxShadow: '0 2px 8px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.2)',
  },
  danger: {
    background: 'var(--red-500)',
    color: '#fff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 2px 8px rgba(230,53,40,.3), 0 1px 3px rgba(0,0,0,.14)',
  },
  'ghost-danger': {
    background: 'transparent',
    color: 'var(--red-500)',
    boxShadow: '0 0 0 1.5px rgba(230,53,40,.4)',
  },
  success: {
    background: 'var(--green-500)',
    color: '#fff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 2px 8px rgba(20,164,87,.28)',
  },
  info: {
    background: 'var(--blue-500)',
    color: '#fff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 2px 8px rgba(43,109,232,.3)',
  },
};

const hoverVariantStyles: Record<ButtonVariant, React.CSSProperties> = {
  glass: {
    background: 'rgba(238,202,68,.95)',
    transform: 'translateY(-1px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(0,0,0,.12), 0 4px 16px rgba(238,202,68,.38), 0 1px 4px rgba(0,0,0,.18)',
  },
  primary: {
    background: 'var(--yellow-300)',
    transform: 'translateY(-1px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.1), 0 4px 14px rgba(238,202,68,.42), 0 1px 4px rgba(0,0,0,.14)',
  },
  ghost: {
    background: 'var(--ghost-hover)',
    color: 'var(--ghost-text)',
  },
  'ghost-accent': {
    background: 'rgba(238,202,68,.12)',
    transform: 'scale(1.015)',
  },
  subtle: {
    background: 'var(--surface-dark)',
    transform: 'translateY(-1px)',
  },
  dark: {
    background: 'var(--neutral-900)',
    transform: 'translateY(-1px)',
  },
  danger: {
    background: 'var(--red-400)',
    transform: 'translateY(-1px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 4px 14px rgba(230,53,40,.4), 0 1px 4px rgba(0,0,0,.16)',
  },
  'ghost-danger': {
    background: 'rgba(230,53,40,.08)',
    transform: 'scale(1.015)',
  },
  success: {
    background: 'var(--green-400)',
    transform: 'translateY(-1px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 4px 14px rgba(20,164,87,.38)',
  },
  info: {
    background: 'var(--blue-400)',
    transform: 'translateY(-1px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2), 0 4px 14px rgba(43,109,232,.4)',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  style,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      disabled={isDisabled}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'transform .15s ease, box-shadow .15s ease, background .15s, opacity .13s, color .13s',
        opacity: isDisabled && !loading ? 0.38 : 1,
        width: fullWidth ? '100%' : undefined,
        position: 'relative',
        overflow: loading ? 'hidden' : undefined,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...(hovered ? hoverVariantStyles[variant] : {}),
        ...style,
      }}
      className={className}
      {...props}
    >
      {loading && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,.3)',
              borderTopColor: 'rgba(255,255,255,.9)',
              animation: 'btn-spin .7s linear infinite',
              display: 'block',
            }}
          />
        </span>
      )}
      <span style={{ opacity: loading ? 0 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        {iconLeft}
        {children}
        {iconRight}
      </span>
    </button>
  );
}
