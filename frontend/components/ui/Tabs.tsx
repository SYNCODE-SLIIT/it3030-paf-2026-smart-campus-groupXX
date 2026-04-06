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

function PillTabs({ tabs, value, onChange, className = '', style }: Omit<TabsProps, 'variant'>) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = React.useState({ left: 0, width: 0, ready: false });

  React.useLayoutEffect(() => {
    const activeIndex = tabs.findIndex(t => t.value === value);
    const btn = tabRefs.current[activeIndex];
    if (btn) {
      setPillStyle({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
    }
  }, [value, tabs]);

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
        position: 'relative',
        transition: 'background .3s, border-color .3s',
        ...style,
      }}
    >
      {pillStyle.ready && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            left: pillStyle.left,
            width: pillStyle.width,
            bottom: 4,
            borderRadius: 100,
            background: 'var(--surface)',
            boxShadow: '0 1px 3px rgba(20,18,12,.08), 0 1px 1px rgba(20,18,12,.04)',
            transition: 'left .2s ease, width .2s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      {tabs.map((tab, i) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={el => { tabRefs.current[i] = el; }}
            onClick={() => onChange(tab.value)}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11.5,
              fontWeight: 700,
              color: isActive ? 'var(--text-h)' : 'var(--text-muted)',
              padding: '6px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 100,
              letterSpacing: '.04em',
              transition: 'color .2s',
              position: 'relative',
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
    return <PillTabs tabs={tabs} value={value} onChange={onChange} className={className} style={style} />;
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
