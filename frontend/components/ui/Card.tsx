'use client';

import React from 'react';
import Image from 'next/image';

interface CardProps {
  variant?: 'default' | 'dark';
  hoverable?: boolean;
  image?: string;
  imageAlt?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  variant = 'default',
  hoverable = false,
  image,
  imageAlt = '',
  footer,
  children,
  onClick,
  className = '',
  style,
}: CardProps) {
  const isDark = variant === 'dark';

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: isDark ? 'var(--surface-dark)' : 'var(--surface)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: isDark ? 'var(--dark-shadow)' : 'var(--card-shadow)',
        transition: 'background .3s, border-color .3s, box-shadow .3s, transform .18s',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = isDark
            ? 'var(--dark-shadow)'
            : 'var(--card-shadow-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = isDark
            ? 'var(--dark-shadow)'
            : 'var(--card-shadow)';
        }
      }}
    >
      {image && (
        <Image
          src={image}
          alt={imageAlt}
          width={1200}
          height={140}
          unoptimized
          style={{
            width: '100%',
            height: 140,
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
      <div style={{ padding: 24 }}>{children}</div>
      {footer && (
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            transition: 'border-color .3s',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
