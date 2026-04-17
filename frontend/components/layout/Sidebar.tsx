'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, Calendar, TrendingUp,
  FolderOpen, MessageSquare, BarChart2,
  Bell, ChevronUp, LogOut, Building2, User, Settings, ShieldCheck,
} from 'lucide-react';
import type { ManagerRole, UserType } from '@/lib/api-types';
import { Avatar } from '@/components/ui';
import { GlassPill } from '@/components/ui/GlassPill';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: number;
  href?: string;
  /** Roles that can see this item. Omit to show to everyone. */
  allowedUserTypes?: UserType[];
  /** Manager sub-roles that can see this item. Omit to show to every manager. */
  allowedManagerRoles?: ManagerRole[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  sections?: NavSection[];
  activePath?: string;
  user?: { name: string; role?: string; initials?: string; src?: string };
  notificationCount?: number;
  onNavigate?: (item: NavItem) => void;
  onLogout?: () => void;
  profileDropdownItems?: DropdownMenuItem[];
  brandSubtitle?: string;
  /** Render as a relative-positioned block for inline demos */
  inline?: boolean;
}

export const defaultSidebarSections: NavSection[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Academics',
    items: [
      { label: 'Courses',   icon: BookOpen,   badge: 3 },
      { label: 'Schedule',  icon: Calendar             },
      { label: 'Grades',    icon: TrendingUp,  allowedUserTypes: ['STUDENT', 'FACULTY'] },
      { label: 'Resources', icon: FolderOpen           },
    ],
  },
  {
    title: 'Communicate',
    items: [
      { label: 'Messages',  icon: MessageSquare, badge: 12 },
      { label: 'Analytics', icon: BarChart2, allowedUserTypes: ['FACULTY', 'ADMIN'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'User Management', icon: ShieldCheck, allowedUserTypes: ['ADMIN'] },
      { label: 'Settings',        icon: Settings,    allowedUserTypes: ['ADMIN'] },
    ],
  },
];

function SidebarNavItem({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const IconComp = item.icon;

  function handleClick() {
    if (!active) {
      setBouncing(true);
      onClick();
    }
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onAnimationEnd={() => setBouncing(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        height: 38,
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: active ? 700 : 500,
        fontSize: 12,
        letterSpacing: '.01em',
        transition: 'background .15s, color .15s, box-shadow .15s',
        background: active
          ? 'var(--yellow-400)'
          : hovered
          ? 'rgba(238,202,68,.09)'
          : 'transparent',
        color: active ? 'var(--yellow-900)' : hovered ? 'var(--text-h)' : 'var(--text-body)',
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.08), 0 2px 8px rgba(238,202,68,.28)'
          : 'none',
        animation: bouncing ? 'nav-bounce .35s ease forwards' : 'none',
        transformOrigin: 'center',
      }}
    >
      <span style={{ opacity: active ? 1 : hovered ? 0.85 : 0.55, transition: 'opacity .15s', flexShrink: 0, display: 'flex' }}>
        <IconComp size={16} strokeWidth={2.2} />
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 100,
          background: active ? 'rgba(0,0,0,.15)' : 'var(--yellow-400)',
          color: 'var(--yellow-900)',
          fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600,
        }}>
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  sections = defaultSidebarSections,
  activePath = 'Dashboard',
  user = { name: 'Alex Rivera', role: 'BSc Computer Science', initials: 'AR' },
  notificationCount = 0,
  onNavigate,
  onLogout,
  profileDropdownItems,
  brandSubtitle = 'Student Portal',
  inline = false,
}: SidebarProps) {
  const [active, setActive] = useState(activePath);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellHovered, setBellHovered] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  function handleNav(item: NavItem) {
    setActive(item.label);
    onNavigate?.(item);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const resolvedProfileDropdownItems: DropdownMenuItem[] = profileDropdownItems ?? [
    { label: 'My Organization', icon: Building2 },
    { label: 'My Profile', icon: User },
    { label: 'Settings', icon: Settings },
    { label: 'Log Out', icon: LogOut, danger: true, dividerBefore: true, onClick: onLogout },
  ];

  return (
    <GlassPill
      as="aside"
      radius={22}
      style={inline ? {
        position: 'relative',
        width: 224,
        height: 480,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      } : {
        position: 'fixed',
        top: 24,
        left: 24,
        bottom: 24,
        width: 224,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        overflow: 'visible',
      }}
    >
      {/* Inner clip wrapper — keeps content clipped while dropdown can escape */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 22, overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'var(--yellow-400)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 0 2px 8px rgba(238,202,68,.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--yellow-900)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
                letterSpacing: '-0.02em', color: 'var(--text-h)', lineHeight: 1.1,
              }}>
                Smart<span style={{ color: 'var(--yellow-400)' }}>Campus</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 7.5, fontWeight: 500,
                letterSpacing: '.16em', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginTop: 2,
              }}>
                {brandSubtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sections.map((section, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.title && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7.5, fontWeight: 600,
                  letterSpacing: '.2em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', padding: '0 12px', marginBottom: 4,
                }}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.label}
                  item={item}
                  active={active === item.label || (!!item.href && item.href === activePath)}
                  onClick={() => handleNav(item)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Profile strip */}
        <div style={{ padding: '10px 12px', flexShrink: 0 }}>
          <div style={{ height: 1, background: 'var(--border)', margin: '0 4px 10px', borderRadius: 1 }} />

          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: dropdownOpen ? 'rgba(238,202,68,.07)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'background .15s',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              }}
            >
              {/* Bell */}
              <div style={{ position: 'relative', flexShrink: 0, marginRight: 10 }}>
                <span
                  onMouseEnter={() => setBellHovered(true)}
                  onMouseLeave={() => setBellHovered(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: bellHovered ? 'var(--text-h)' : 'var(--text-muted)',
                    transition: 'color .15s',
                  }}
                >
                  <Bell size={15} strokeWidth={2.2} />
                </span>
                {notificationCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5,
                    minWidth: 14, height: 14, borderRadius: 100,
                    background: 'var(--yellow-400)', color: 'var(--yellow-900)',
                    fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    boxShadow: '0 0 0 1.5px var(--surface)',
                  }}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </div>

              {/* Vertical divider */}
              <div style={{ width: 1, height: 20, background: 'var(--border)', marginRight: 10, flexShrink: 0 }} />

              {/* Name */}
              <span style={{
                flex: 1,
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5,
                color: 'var(--text-h)', textAlign: 'left',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.name}
              </span>

              {/* Chevron */}
              <span style={{
                color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4, marginRight: 8,
                transform: dropdownOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform .2s ease',
                display: 'flex',
              }}>
                <ChevronUp size={13} strokeWidth={2.5} />
              </span>

              {/* Avatar */}
              <Avatar
                initials={user.initials ?? user.name.slice(0, 2).toUpperCase()}
                src={user.src}
                size="sm"
              />
            </button>

            <DropdownMenu items={resolvedProfileDropdownItems} open={dropdownOpen} direction="up" />
          </div>
        </div>

      </div>
    </GlassPill>
  );
}
