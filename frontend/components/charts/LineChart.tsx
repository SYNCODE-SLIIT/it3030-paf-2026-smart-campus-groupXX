'use client';

import React from 'react';

export interface LineChartSeries {
  label: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: LineChartSeries[];
  height?: number;
  yFormatter?: (value: number) => string;
  emptyLabel?: string;
}

const PADDING = { top: 20, right: 16, bottom: 28, left: 38 };

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  const path: string[] = [`M${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path.push(`C${midX},${current.y} ${midX},${next.y} ${next.x},${next.y}`);
  }
  return path.join(' ');
}

export function LineChart({
  labels,
  series,
  height = 260,
  yFormatter = (value) => value.toLocaleString(),
  emptyLabel = 'No data yet',
}: LineChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(640);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.max(280, Math.floor(entry.contentRect.width)));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const safeSeries = series.map((s) => ({ ...s, values: s.values.length === labels.length ? s.values : [] }));
  const allValues = safeSeries.flatMap((s) => s.values);
  const hasData = labels.length > 0 && allValues.length > 0;

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

  const minValue = 0;
  const maxValueRaw = Math.max(...allValues, 1);
  const maxValue = maxValueRaw === 0 ? 1 : Math.ceil(maxValueRaw * 1.1);

  const chartWidth = width;
  const innerWidth = Math.max(20, chartWidth - PADDING.left - PADDING.right);
  const innerHeight = Math.max(20, height - PADDING.top - PADDING.bottom);

  const xStep = labels.length > 1 ? innerWidth / (labels.length - 1) : 0;

  function getPoints(values: number[]) {
    return values.map((value, index) => ({
      x: PADDING.left + (labels.length === 1 ? innerWidth / 2 : index * xStep),
      y: PADDING.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight,
    }));
  }

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, idx) => minValue + ((maxValue - minValue) * idx) / yTicks);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`} role="img">
        <defs>
          {safeSeries.map((s, idx) => (
            <React.Fragment key={`grad-${s.label}-${idx}`}>
              <linearGradient id={`stroke-${idx}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id={`area-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            </React.Fragment>
          ))}
        </defs>

        {tickValues.map((value, idx) => {
          const y = PADDING.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
          return (
            <g key={`tick-${idx}`}>
              <line
                x1={PADDING.left}
                x2={chartWidth - PADDING.right}
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
                {yFormatter(value)}
              </text>
            </g>
          );
        })}

        {labels.map((label, idx) => {
          const x = PADDING.left + (labels.length === 1 ? innerWidth / 2 : idx * xStep);
          return (
            <text
              key={`label-${idx}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--text-muted)"
            >
              {label}
            </text>
          );
        })}

        {safeSeries.map((s, idx) => {
          const points = getPoints(s.values);
          if (points.length === 0) return null;

          const linePath = buildSmoothPath(points);
          const areaPath = `${linePath} L${points[points.length - 1].x},${PADDING.top + innerHeight} L${points[0].x},${PADDING.top + innerHeight} Z`;

          return (
            <g key={`series-${s.label}-${idx}`}>
              <path d={areaPath} fill={`url(#area-${idx})`} />
              <path
                d={linePath}
                fill="none"
                stroke={`url(#stroke-${idx})`}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 4px 8px ${s.color}55)` }}
              />
              {points.map((point, pIdx) => (
                <circle
                  key={`pt-${idx}-${pIdx}`}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill="var(--surface)"
                  stroke={s.color}
                  strokeWidth={2}
                >
                  <title>{`${labels[pIdx]} · ${s.label}: ${yFormatter(s.values[pIdx])}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {safeSeries.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginTop: 6,
          }}
        >
          {safeSeries.map((s, idx) => (
            <div
              key={`legend-${idx}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}
            >
              <span style={{ width: 12, height: 4, borderRadius: 2, background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
