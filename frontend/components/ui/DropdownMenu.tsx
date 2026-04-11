'use client';

import React, { useState } from 'react';

export interface DropdownMenuItem {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  danger?: boolean;
  dividerBefore?: boolean;
  onClick?: () => void;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  open: boolean;
  direction?: 'up' | 'down';
}

function MenuItem({ item }: { item: DropdownMenuItem }) {
  const [hovered, setHovered] = useState(false);
  const IconComp = item.icon;

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={item.onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        border: 'none',
        background: hovered
          ? item.danger ? 'rgba(230,53,40,.07)' : 'rgba(238,202,68,.07)'
          : 'transparent',
        cursor: 'pointer',
        color: item.danger
          ? hovered ? 'var(--red-500)' : 'var(--text-muted)'
          : hovered ? 'var(--text-h)' : 'var(--text-body)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '.01em',
        transition: 'background .13s, color .13s',
        textAlign: 'left',
      }}
    >
      <span style={{ opacity: hovered ? 1 : 0.6, transition: 'opacity .13s', flexShrink: 0, display: 'flex' }}>
        <IconComp size={15} strokeWidth={2.2} />
      </span>
      {item.label}
    </button>
  );
}

export function DropdownMenu({ items, open, direction = 'down' }: DropdownMenuProps) {
  if (!open) return null;

  const positionStyle: React.CSSProperties =
    direction === 'up'
      ? { bottom: 'calc(100% + 8px)', top: 'auto' }
      : { top: 'calc(100% + 8px)', bottom: 'auto' };

  const animationName = direction === 'up' ? 'dropdown-up' : 'dropdown-down';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...positionStyle,
        borderRadius: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow:
          direction === 'up'
            ? '0 -4px 24px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)'
            : '0 4px 24px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)',
        overflow: 'hidden',
        zIndex: 100,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: `${animationName} .15s ease`,
      }}
    >
      <style>{`
        @keyframes dropdown-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdown-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {items.map((item) => (
        <React.Fragment key={item.label}>
          {item.dividerBefore && (
            <div style={{ height: 1, background: 'var(--border)', margin: '0 12px' }} />
          )}
          <MenuItem item={item} />
        </React.Fragment>
      ))}
    </div>
  );
}
