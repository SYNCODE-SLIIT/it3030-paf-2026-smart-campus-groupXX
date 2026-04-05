import React from 'react';

type SkeletonVariant = 'line' | 'circle' | 'rect';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const borderRadiusMap: Record<SkeletonVariant, string> = {
  line:   '100px',
  circle: '50%',
  rect:   'var(--radius-md)',
};

const defaultHeight: Record<SkeletonVariant, string | number> = {
  line:   10,
  circle: 40,
  rect:   80,
};

export function Skeleton({
  variant = 'line',
  width = '100%',
  height,
  className = '',
  style,
}: SkeletonProps) {
  return (
    <span
      className={className}
      style={{
        display: 'block',
        width,
        height: height ?? defaultHeight[variant],
        borderRadius: borderRadiusMap[variant],
        background: 'var(--skeleton-base)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, var(--skeleton-shine) 50%, transparent 100%)',
          animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
        }}
      />
    </span>
  );
}
