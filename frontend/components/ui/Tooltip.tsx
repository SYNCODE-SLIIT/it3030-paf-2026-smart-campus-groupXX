'use client';

import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: `translateX(-50%) translateY(${visible ? 0 : 4}px)`,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '.06em',
          background: 'var(--neutral-950)',
          color: 'var(--neutral-100)',
          padding: '5px 10px',
          borderRadius: 7,
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity .15s, transform .15s',
          boxShadow: '0 4px 12px rgba(0,0,0,.3)',
          zIndex: 100,
        }}
      >
        {content}
        {/* arrow */}
        <span
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid var(--neutral-950)',
          }}
        />
      </span>
    </span>
  );
}
