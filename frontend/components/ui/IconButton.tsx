'use client';

import React from 'react';

type IconButtonVariant = 'neutral' | 'danger' | 'warning' | 'primary';
type IconButtonSize = 'sm' | 'md';

const variantStyles: Record<IconButtonVariant, { color: string; hoverBg: string }> = {
  neutral: { color: 'var(--text-muted)',   hoverBg: 'rgba(20,18,12,0.06)'   },
  danger:  { color: 'var(--red-500)',      hoverBg: 'rgba(230,53,40,0.08)'  },
  warning: { color: 'var(--orange-400)',   hoverBg: 'rgba(255,149,32,0.08)' },
  primary: { color: 'var(--yellow-700)',   hoverBg: 'rgba(238,202,68,0.12)' },
};

const sizeMap: Record<IconButtonSize, number> = {
  sm: 26,
  md: 32,
};

interface IconButtonProps {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  title?: string;
  'aria-label'?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function IconButton({
  icon,
  variant = 'neutral',
  size = 'sm',
  title,
  'aria-label': ariaLabel,
  onClick,
  disabled,
  loading,
  type = 'button',
}: IconButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const { color, hoverBg } = variantStyles[variant];
  const dim = sizeMap[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel ?? title}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        background: hovered && !isDisabled ? hoverBg : 'transparent',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        color: isDisabled ? 'var(--text-muted)' : color,
        padding: 0,
        flexShrink: 0,
        opacity: isDisabled ? 0.45 : 1,
        transition: 'background .13s ease, color .13s ease, opacity .13s ease',
      }}
    >
      {loading ? (
        <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'btn-spin 0.6s linear infinite' }} />
      ) : icon}
    </button>
  );
}
