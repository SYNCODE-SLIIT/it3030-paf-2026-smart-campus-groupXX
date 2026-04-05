import React from 'react';

interface DividerProps {
  label?: string;
  strong?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Divider({ label, strong = false, className = '', style }: DividerProps) {
  const borderColor = strong ? 'var(--border-strong)' : 'var(--border)';

  if (label) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          fontWeight: 500,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          ...style,
        }}
      >
        <span style={{ flex: 1, height: 1, background: borderColor, display: 'block' }} />
        {label}
        <span style={{ flex: 1, height: 1, background: borderColor, display: 'block' }} />
      </div>
    );
  }

  return (
    <hr
      className={className}
      style={{
        border: 'none',
        borderTop: `1px solid ${borderColor}`,
        margin: 0,
        transition: 'border-color .3s',
        ...style,
      }}
    />
  );
}
