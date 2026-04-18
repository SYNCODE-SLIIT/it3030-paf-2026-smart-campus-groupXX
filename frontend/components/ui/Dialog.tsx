'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdropClick?: boolean;
  children: React.ReactNode;
}

const sizeWidth: Record<'sm' | 'md' | 'lg', number> = {
  sm: 420,
  md: 560,
  lg: 720,
};

export function Dialog({
  open,
  onClose,
  title,
  size = 'md',
  closeOnBackdropClick = true,
  children,
}: DialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const titleId = React.useId();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'dialog-fade-in .15s ease',
      }}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--card-shadow)',
          width: '100%',
          maxWidth: sizeWidth[size],
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'dialog-slide-in .18s ease',
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <span
              id={titleId}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--text-h)',
              }}
            >
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: 6,
                transition: 'color .15s',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
