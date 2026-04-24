'use client';

import React from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  emptyLabel?: string;
}

const TWO_PI = Math.PI * 2;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
  ].join(' ');
}

export function DonutChart({
  data,
  size = 220,
  thickness = 26,
  centerLabel,
  centerValue,
  emptyLabel = 'No data yet',
}: DonutChartProps) {
  const total = data.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const [hovered, setHovered] = React.useState<number | null>(null);

  if (total <= 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `${thickness}px solid var(--surface-2)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '.18em',
          textTransform: 'uppercase',
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  // Build the segments. We accumulate angles using a reducer (instead of a
  // mutable `let` after render) so the lint rule about reassignments after
  // render is satisfied.
  const segments = data.reduce<
    Array<{ slice: DonutSlice; index: number; path: string; fraction: number }>
  >((acc, slice, index) => {
    const fraction = Math.max(0, slice.value) / total;
    const startAngle = acc.length === 0
      ? -Math.PI / 2
      : -Math.PI / 2 + acc.reduce((sum, seg) => sum + seg.fraction * TWO_PI, 0);
    const endAngle = startAngle + fraction * TWO_PI;
    const safeEnd = fraction === 1 ? endAngle - 0.0001 : endAngle;

    acc.push({
      slice,
      index,
      path: describeArc(cx, cy, radius, startAngle, safeEnd),
      fraction,
    });
    return acc;
  }, []);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ position: 'relative', width: size, height: size, alignSelf: 'center', margin: '0 auto' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.35" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={thickness}
          />

          {segments.map((seg) => (
            <path
              key={seg.slice.label}
              d={seg.path}
              fill="none"
              stroke={seg.slice.color}
              strokeWidth={hovered === seg.index ? thickness + 4 : thickness}
              strokeLinecap="butt"
              style={{
                transition: 'stroke-width .2s ease, opacity .2s ease',
                opacity: hovered === null || hovered === seg.index ? 1 : 0.45,
                cursor: 'pointer',
                filter: 'url(#donut-shadow)',
              }}
              onMouseEnter={() => setHovered(seg.index)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${seg.slice.label}: ${seg.slice.value} (${(seg.fraction * 100).toFixed(1)}%)`}</title>
            </path>
          ))}
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {centerLabel && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {centerLabel}
            </span>
          )}
          {centerValue !== undefined && (
            <span
              style={{
                marginTop: 4,
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 28,
                color: 'var(--text-h)',
                lineHeight: 1,
              }}
            >
              {centerValue}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        {data.map((slice, index) => {
          const fraction = total === 0 ? 0 : Math.max(0, slice.value) / total;
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 8,
                background: hovered === index ? 'var(--surface-2)' : 'transparent',
                transition: 'background .15s',
                cursor: 'default',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: slice.color,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${slice.color}22`,
                }}
              />
              <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-h)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {slice.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}
                >
                  {slice.value} · {(fraction * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
