import React from 'react';

type BadgeColor = 'yellow' | 'red' | 'green' | 'blue' | 'neutral';

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const colorStyles: Record<BadgeColor, React.CSSProperties> = {
  yellow:  { background: 'var(--yellow-400)', color: 'var(--yellow-900)' },
  red:     { background: 'var(--red-500)',    color: '#fff' },
  green:   { background: 'var(--green-500)',  color: '#fff' },
  blue:    { background: 'var(--blue-500)',   color: '#fff' },
  neutral: { background: 'var(--neutral-700)', color: 'var(--neutral-100)' },
};

export function Badge({ color = 'yellow', children, className = '', style }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        fontWeight: 500,
        letterSpacing: '.04em',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 100,
        ...colorStyles[color],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
