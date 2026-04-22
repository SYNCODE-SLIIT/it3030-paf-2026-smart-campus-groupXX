'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Avatar, Button, GlassPill } from '@/components/ui';
import { Menu, X } from 'lucide-react';
import type { UserType } from '@/lib/api-types';

export interface NavItem {
  label: string;
  href: string;
  /** Roles that can see this item. Omit to show to everyone. */
  allowedUserTypes?: UserType[];
}

export interface NavUser {
  name: string;
  initials?: string;
  src?: string;
}

interface NavbarProps {
  items: NavItem[];
  currentPath?: string;
  user?: NavUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigate?: (href: string) => void;
  hideAuthActions?: boolean;
  rightAccessory?: React.ReactNode;
}


export function Navbar({ items, currentPath, user, onLogin, onLogout, onNavigate, hideAuthActions, rightAccessory }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 24,
          left: 0,
          width: '100%',
          zIndex: 50,
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Left pill: Logo + Nav */}
        <GlassPill
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 8px 0 20px',
            height: 52,
            pointerEvents: 'auto',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
              marginRight: 6,
              flexShrink: 0,
            }}
          >
            Smart<span style={{ color: 'var(--yellow-400)' }}>Campus</span>
          </span>

          {/* Desktop nav */}
          <nav className="hidden md:flex" style={{ gap: 2, alignItems: 'center' }}>
            {items.map((item) => (
              <NavLink
                key={item.href}
                label={item.label}
                href={item.href}
                active={currentPath === item.href}
                onClick={() => onNavigate?.(item.href)}
              />
            ))}
          </nav>


          {/* Mobile toggle */}
          <button
            className="flex md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-body)',
              padding: '6px 8px',
              marginLeft: 4,
            }}
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
        </GlassPill>

        {/* Right pill: Auth */}
        {!hideAuthActions && (
          <GlassPill
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: user ? '0 8px 0 10px' : '0 8px',
              height: 52,
              pointerEvents: 'auto',
            }}
          >
            {user ? (
              <>
                {rightAccessory}
                <Avatar
                  initials={user.initials ?? user.name.slice(0, 2).toUpperCase()}
                  src={user.src}
                  size="sm"
                />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-h)',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </span>
                <Button variant="ghost" size="sm" onClick={onLogout} style={{ borderRadius: 100 }}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button variant="glass" size="sm" onClick={onLogin} style={{ borderRadius: 100 }}>
                Sign in
              </Button>
            )}
          </GlassPill>
        )}
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(10,9,8,.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
            <GlassPill
              as="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{
                width: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-h)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={22} strokeWidth={2.5} />
            </GlassPill>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item) => {
              const active = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { onNavigate?.(item.href); setMobileOpen(false); }}
                  style={{
                    borderBottom: '1px solid var(--border-strong)',
                    padding: '20px 0',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 32,
                    letterSpacing: '-0.03em',
                    color: active ? 'var(--yellow-400)' : 'var(--text-h)',
                    transition: 'color .15s',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {!hideAuthActions && (
            <div style={{ marginTop: 'auto' }}>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar
                    initials={user.initials ?? user.name.slice(0, 2).toUpperCase()}
                    src={user.src}
                    size="md"
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 15,
                      color: 'var(--text-h)',
                      flex: 1,
                    }}
                  >
                    {user.name}
                  </span>
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    onClick={() => { onLogout?.(); setMobileOpen(false); }}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button variant="glass" size="lg" fullWidth onClick={() => { onLogin?.(); setMobileOpen(false); }}>
                  Sign in
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NavLink({ label, href, active, onClick }: { label: string; href: string; active: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  function handleClick() {
    if (!active) {
      setBouncing(true);
      onClick?.();
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onAnimationEnd={() => setBouncing(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 34,
        padding: '0 14px',
        borderRadius: 100,
        textDecoration: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '.04em',
        transition: 'background .15s, color .15s',
        background: active
          ? 'var(--yellow-400)'
          : hovered
          ? 'rgba(238,202,68,.12)'
          : 'transparent',
        color: active ? 'var(--yellow-900)' : 'var(--text-body)',
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.1), 0 2px 8px rgba(238,202,68,.3)'
          : 'none',
        animation: bouncing ? 'toggle-bounce .35s ease forwards' : 'none',
        transformOrigin: 'center',
      }}
    >
      {label}
    </Link>
  );
}
