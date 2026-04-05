import React from 'react';

type ChipColor = 'yellow' | 'red' | 'green' | 'blue' | 'orange' | 'neutral' | 'glass';
type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  color?: ChipColor;
  size?: ChipSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const colorStyles: Record<ChipColor, React.CSSProperties> = {
  yellow:  { background: 'rgba(238,202,68,.1)',  border: '1px solid rgba(238,202,68,.28)', color: 'var(--yellow-700)' },
  red:     { background: 'var(--red-50)',        border: '1px solid var(--red-200)',       color: 'var(--red-600)'    },
  green:   { background: 'var(--green-50)',      border: '1px solid var(--green-200)',     color: 'var(--green-600)'  },
  blue:    { background: 'var(--blue-50)',       border: '1px solid var(--blue-200)',      color: 'var(--blue-600)'   },
  orange:  { background: 'var(--orange-50)',     border: '1px solid var(--orange-200)',    color: 'var(--orange-600)' },
  neutral: { background: 'var(--surface-2)',     border: '1px solid var(--border)',        color: 'var(--text-muted)' },
  glass: {
    background: 'rgba(238,202,68,.09)',
    border: 'none',
    color: 'rgba(238,202,68,.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: 'inset 0 1px 0 rgba(238,202,68,.2), inset 0 -1px 0 rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.16)',
  },
};

const dotColorMap: Record<ChipColor, string> = {
  yellow:  'var(--yellow-400)',
  red:     'var(--red-400)',
  green:   'var(--green-400)',
  blue:    'var(--blue-400)',
  orange:  'var(--orange-400)',
  neutral: 'var(--neutral-400)',
  glass:   'var(--yellow-400)',
};

const sizeStyles: Record<ChipSize, React.CSSProperties> = {
  sm: { fontSize: 7.5, padding: '3px 8px' },
  md: { fontSize: 9,   padding: '4px 10px' },
  lg: { fontSize: 10,  padding: '5px 13px' },
};

export function Chip({
  color = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
  style,
}: ChipProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        borderRadius: 100,
        transition: 'background .15s, border-color .15s, color .15s',
        ...sizeStyles[size],
        ...colorStyles[color],
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: dotColorMap[color],
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
