import React from 'react';
import Image from 'next/image';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape = 'circle' | 'square';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
  style?: React.CSSProperties;
}

const sizePx: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 68,
};

const fontSizePx: Record<AvatarSize, number> = {
  xs: 9,
  sm: 12,
  md: 15,
  lg: 18,
  xl: 24,
};

export function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',
  shape = 'circle',
  className = '',
  style,
}: AvatarProps) {
  const px = sizePx[size];
  const borderRadius = shape === 'circle' ? '50%' : 'var(--radius-md)';

  const base: React.CSSProperties = {
    width: px,
    height: px,
    borderRadius,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: fontSizePx[size],
    background: 'rgba(238,202,68,.82)',
    color: 'var(--yellow-900)',
    backdropFilter: 'blur(8px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.1), 0 2px 6px rgba(238,202,68,.22)',
    userSelect: 'none',
    ...style,
  };

  if (src) {
    return (
      <span className={className} style={base}>
        <Image
          src={src}
          alt={alt}
          width={px}
          height={px}
          unoptimized
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </span>
    );
  }

  return (
    <span className={className} style={base}>
      {initials ?? '?'}
    </span>
  );
}

interface AvatarStackProps {
  children: React.ReactNode;
  className?: string;
}

export function AvatarStack({ children, className = '' }: AvatarStackProps) {
  return (
    <div
      className={className}
      style={{ display: 'flex' }}
    >
      {React.Children.map(children, (child, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            position: 'relative',
          }}
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
                style: {
                  border: '2px solid var(--surface)',
                  ...(child as React.ReactElement<{ style?: React.CSSProperties }>).props.style,
                },
              })
            : child}
        </div>
      ))}
    </div>
  );
}
