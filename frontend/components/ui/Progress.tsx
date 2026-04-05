import React from 'react';

type ProgressSize = 'sm' | 'md' | 'lg';
type ProgressColor = 'yellow' | 'green' | 'blue' | 'red' | 'orange';

interface ProgressProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: ProgressSize;
  color?: ProgressColor;
  className?: string;
  style?: React.CSSProperties;
}

const trackHeight: Record<ProgressSize, number> = {
  sm: 4,
  md: 8,
  lg: 12,
};

const fillColor: Record<ProgressColor, string> = {
  yellow: 'var(--yellow-400)',
  green:  'var(--green-500)',
  blue:   'var(--blue-500)',
  red:    'var(--red-500)',
  orange: 'var(--orange-500)',
};

export function Progress({
  value,
  label,
  showValue = false,
  size = 'md',
  color = 'yellow',
  className = '',
  style,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {label && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--text-label)',
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}
            >
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: trackHeight[size],
          background: 'var(--border)',
          borderRadius: 100,
          overflow: 'hidden',
          transition: 'background .3s',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            borderRadius: 100,
            background: fillColor[color],
            transition: 'width .6s cubic-bezier(.4,0,.2,1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* shimmer */}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.28) 50%, transparent 100%)',
              animation: 'progress-shimmer 2s linear infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
