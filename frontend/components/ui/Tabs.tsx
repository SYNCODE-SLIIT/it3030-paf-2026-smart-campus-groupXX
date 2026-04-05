'use client';

import React from 'react';
import { Badge } from './Badge';

type TabsVariant = 'underline' | 'pill' | 'boxed';

interface Tab {
  label: string;
  value: string;
  badge?: number;
}

interface TabsProps {
  variant?: TabsVariant;
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs({
  variant = 'underline',
  tabs,
  value,
  onChange,
  className = '',
  style,
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          borderBottom: '1.5px solid var(--border)',
          gap: 0,
          transition: 'border-color .3s',
          ...style,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? 'var(--text-h)' : 'var(--text-muted)',
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                position: 'relative',
                transition: 'color .18s',
                letterSpacing: '-0.01em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <Badge color={isActive ? 'yellow' : 'neutral'}>{tab.badge}</Badge>
              )}
              {/* active indicator */}
              <span
                style={{
                  position: 'absolute',
                  bottom: -1.5,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--yellow-400)',
                  borderRadius: '2px 2px 0 0',
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform .2s ease',
                }}
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          gap: 3,
          padding: 4,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 100,
          transition: 'background .3s, border-color .3s',
          ...style,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 11.5,
                fontWeight: 700,
                color: isActive ? 'var(--text-h)' : 'var(--text-muted)',
                padding: '6px 16px',
                border: 'none',
                background: isActive ? 'var(--surface)' : 'transparent',
                cursor: 'pointer',
                borderRadius: 100,
                letterSpacing: '.04em',
                transition: 'color .15s, background .15s, box-shadow .15s',
                boxShadow: isActive
                  ? '0 1px 3px rgba(20,18,12,.08), 0 1px 1px rgba(20,18,12,.04)'
                  : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <Badge color={isActive ? 'yellow' : 'neutral'}>{tab.badge}</Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // boxed
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        transition: 'background .3s, border-color .3s',
        ...style,
      }}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.value === value;
        const isLast = i === tabs.length - 1;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{
              flex: 1,
              fontFamily: 'var(--font-display)',
              fontSize: 11.5,
              fontWeight: 700,
              color: isActive ? 'var(--text-h)' : 'var(--text-muted)',
              padding: '10px 16px',
              border: 'none',
              borderRight: isLast ? 'none' : '1px solid var(--border)',
              background: isActive ? 'var(--surface)' : 'transparent',
              cursor: 'pointer',
              letterSpacing: '.04em',
              transition: 'color .15s, background .15s',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <Badge color={isActive ? 'yellow' : 'neutral'}>{tab.badge}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
