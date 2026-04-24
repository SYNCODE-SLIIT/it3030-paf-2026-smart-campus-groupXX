'use client';

import React from 'react';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  defaultColor?: string;
  emptyLabel?: string;
}

const PADDING = { top: 16, right: 16, bottom: 16, left: 36 };
const FALLBACK_COLORS = [
  'var(--blue-400)',
  'var(--yellow-400)',
  'var(--orange-400)',
  'var(--green-400)',
  'var(--red-400)',
  'var(--neutral-500)',
  'var(--blue-700)',
];

export function BarChart({
  data,
  height = 260,
  defaultColor = 'var(--yellow-400)',
  emptyLabel = 'No data yet',
}: BarChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartId = React.useId();
  const [width, setWidth] = React.useState(0);
  const [hovered, setHovered] = React.useState<number | null>(null);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.max(120, Math.floor(entry.contentRect.width)));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          borderRadius: 12,
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  const innerWidth = Math.max(20, width - PADDING.left - PADDING.right);
  const innerHeight = Math.max(20, height - PADDING.top - PADDING.bottom);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const ceiling = Math.ceil(maxValue * 1.1);
  const resolvedData = data.map((bar, idx) => ({
    ...bar,
    resolvedColor: bar.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length] ?? defaultColor,
  }));

  const barCount = resolvedData.length;
  const groupWidth = innerWidth / barCount;
  const barWidth = Math.min(46, groupWidth * 0.72);
  const total = resolvedData.reduce((sum, bar) => sum + Math.max(0, bar.value), 0);

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, idx) => (ceiling / yTicks) * idx);

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
      <svg
        width={Math.max(120, width)}
        height={height}
        viewBox={`0 0 ${Math.max(120, width)} ${height}`}
        role="img"
        style={{ display: 'block', maxWidth: '100%' }}
      >
        <defs>
          {resolvedData.map((bar, idx) => {
            const color = bar.resolvedColor;
            return (
              <linearGradient key={`bar-grad-${idx}`} id={`${chartId}-bar-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </linearGradient>
            );
          })}
        </defs>

        {tickValues.map((value, idx) => {
          const y = PADDING.top + innerHeight - (value / ceiling) * innerHeight;
          return (
            <g key={`yt-${idx}`}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeWidth={1}
                opacity={idx === 0 ? 0 : 0.6}
              />
              <text
                x={PADDING.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fontFamily="var(--font-mono)"
                fill="var(--text-muted)"
              >
                {Math.round(value).toLocaleString()}
              </text>
            </g>
          );
        })}

        {resolvedData.map((bar, idx) => {
          const ratio = bar.value / ceiling;
          const barHeight = innerHeight * ratio;
          const groupCenterX = PADDING.left + idx * groupWidth + groupWidth / 2;
          const x = groupCenterX - barWidth / 2;
          const y = PADDING.top + innerHeight - barHeight;
          const isHover = hovered === idx;

          return (
            <g
              key={`bar-${idx}`}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0, barHeight)}
                rx={6}
                ry={6}
                fill={`url(#${chartId}-bar-grad-${idx})`}
                style={{
                  transition: 'opacity .15s, transform .15s',
                  opacity: hovered === null || isHover ? 1 : 0.55,
                  filter: isHover ? `drop-shadow(0 6px 14px ${bar.resolvedColor}55)` : undefined,
                }}
              >
                <title>{`${bar.label}: ${bar.value}`}</title>
              </rect>
              <text
                x={groupCenterX}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-display)"
                fontWeight={700}
                fill="var(--text-h)"
                opacity={isHover ? 1 : 0.85}
              >
                {bar.value}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 8,
        }}
      >
        {resolvedData.map((bar, idx) => {
          const isHover = hovered === idx;
          const percentage = total > 0 ? (Math.max(0, bar.value) / total) * 100 : 0;
          const color = bar.resolvedColor;

          return (
            <div
              key={`legend-${idx}`}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 10,
                background: isHover ? 'var(--surface-2)' : 'transparent',
                transition: 'background .15s',
                cursor: 'default',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${color}22`,
                }}
              />
              <div style={{ display: 'grid', minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--text-h)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {bar.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}
                >
                  {bar.value} | {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
