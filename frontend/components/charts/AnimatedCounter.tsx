'use client';

import React from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
  decimals?: number;
}

/**
 * Counts up from 0 (or the previous value) to `value` using
 * requestAnimationFrame and a smooth easing curve. Used for KPI cards and
 * other dashboard stat displays so numbers feel "alive" when data loads.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  format,
  className,
  style,
  decimals = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const previousValueRef = React.useRef(0);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const start = previousValueRef.current;
    const end = Number.isFinite(value) ? value : 0;
    const startedAt = performance.now();

    function tick(now: number) {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = end;
      }
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, duration]);

  const rendered = format
    ? format(displayValue)
    : decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString();

  return (
    <span className={className} style={style}>
      {rendered}
    </span>
  );
}
