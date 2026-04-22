'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';

import type { NotificationResponse } from '@/lib/api-types';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface NotificationBellProps {
  unreadCount: number;
  notifications: NotificationResponse[];
  loading?: boolean;
  error?: string | null;
  onOpen?: () => void | Promise<void>;
  onMarkAsRead?: (notification: NotificationResponse) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
  onNavigate?: (notification: NotificationResponse) => void;
  placement?: 'above' | 'below';
  align?: 'left' | 'right';
  portal?: boolean;
}

export function NotificationBell({
  unreadCount,
  notifications,
  loading,
  error,
  onOpen,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
  placement = 'above',
  align = 'right',
  portal = false,
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const updateAnchorRect = React.useCallback(() => {
    if (ref.current) {
      setAnchorRect(ref.current.getBoundingClientRect());
    }
  }, []);

  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        ref.current
        && !ref.current.contains(target)
        && !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClick);
    }

    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  React.useEffect(() => {
    if (!open || !portal) {
      return undefined;
    }

    updateAnchorRect();
    window.addEventListener('resize', updateAnchorRect);
    window.addEventListener('scroll', updateAnchorRect, true);

    return () => {
      window.removeEventListener('resize', updateAnchorRect);
      window.removeEventListener('scroll', updateAnchorRect, true);
    };
  }, [open, portal, updateAnchorRect]);

  async function toggleOpen() {
    const nextOpen = !open;
    if (nextOpen) {
      updateAnchorRect();
    }
    setOpen(nextOpen);
    if (nextOpen) {
      await onOpen?.();
    }
  }

  function popoverStyle(): React.CSSProperties {
    const base: React.CSSProperties = {
      width: 'min(420px, calc(100vw - 32px))',
      maxHeight: 560,
      overflowY: 'auto',
      padding: 14,
      borderRadius: 'var(--radius-xl)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
      zIndex: portal ? 1000 : 100,
    };

    if (!portal) {
      return {
        ...base,
        position: 'absolute',
        left: align === 'left' ? 0 : undefined,
        right: align === 'right' ? 0 : undefined,
        bottom: placement === 'above' ? 'calc(100% + 10px)' : undefined,
        top: placement === 'below' ? 'calc(100% + 10px)' : undefined,
      };
    }

    const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
    const estimatedWidth = Math.min(420, viewportWidth - 32);
    const left = anchorRect
      ? align === 'left'
        ? Math.min(Math.max(16, anchorRect.left), viewportWidth - estimatedWidth - 16)
        : undefined
      : 16;
    const right = anchorRect && align === 'right'
      ? Math.max(16, viewportWidth - anchorRect.right)
      : undefined;

    return {
      ...base,
      position: 'fixed',
      left,
      right,
      top: placement === 'below'
        ? anchorRect ? Math.min(anchorRect.bottom + 10, viewportHeight - 80) : 64
        : undefined,
      bottom: placement === 'above'
        ? anchorRect ? Math.min(viewportHeight - anchorRect.top + 10, viewportHeight - 80) : 64
        : undefined,
    };
  }

  const popover = (
    <div ref={popoverRef} style={popoverStyle()}>
      <NotificationCenter
        notifications={notifications}
        loading={loading}
        error={error}
        onRefresh={onOpen}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onNavigate={(notification) => {
          setOpen(false);
          onNavigate?.(notification);
        }}
      />
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => void toggleOpen()}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: open ? 'rgba(238,202,68,.12)' : 'var(--surface)',
          color: 'var(--text-h)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}
      >
        <Bell size={16} strokeWidth={2.25} />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              borderRadius: 100,
              background: 'var(--yellow-400)',
              color: 'var(--neutral-950)',
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 0 2px var(--surface)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (portal ? createPortal(popover, document.body) : popover)}
    </div>
  );
}
