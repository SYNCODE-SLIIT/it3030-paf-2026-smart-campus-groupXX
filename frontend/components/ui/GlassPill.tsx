'use client';

import React from 'react';

interface GlassPillProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  radius?: number | string;
}

export function GlassPill({ as: Tag = 'div', radius = 100, style, children, ...props }: GlassPillProps) {
  return (
    <Tag
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        borderRadius: radius,
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 var(--nav-inset), 0 2px 16px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.05)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
