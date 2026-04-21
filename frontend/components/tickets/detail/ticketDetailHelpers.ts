import type React from 'react';
import type { TicketPriority, TicketStatus, UserResponse } from '@/lib/api-types';

export const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICAL: 'Electrical',
  NETWORK: 'Network',
  EQUIPMENT: 'Equipment',
  FURNITURE: 'Furniture',
  CLEANLINESS: 'Cleanliness',
  FACILITY_DAMAGE: 'Facility Damage',
  ACCESS_SECURITY: 'Access / Security',
  OTHER: 'Other',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const PRIORITY_STRIPE: Record<TicketPriority, string> = {
  LOW: 'var(--neutral-400)',
  MEDIUM: 'var(--blue-400)',
  HIGH: 'var(--orange-400)',
  URGENT: 'var(--red-400)',
};

export const PRIORITY_CHIP_COLOR: Record<TicketPriority, 'neutral' | 'blue' | 'orange' | 'red'> = {
  LOW: 'neutral',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

export type SegColor = [string, string, string];

export const STATUS_SEGS: Record<TicketStatus, SegColor> = {
  OPEN:        ['var(--blue-400)',    'var(--border)', 'var(--border)'],
  IN_PROGRESS: ['var(--yellow-400)', 'var(--yellow-400)', 'var(--border)'],
  RESOLVED:    ['var(--green-400)',   'var(--green-400)', 'var(--green-400)'],
  CLOSED:      ['var(--neutral-300)', 'var(--neutral-300)', 'var(--neutral-300)'],
  REJECTED:    ['var(--red-400)',     'var(--border)', 'var(--border)'],
};

export const STATUS_DISPLAY: Record<TicketStatus, string> = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
  REJECTED:    'Rejected',
};

export function statusChipColor(status: TicketStatus): 'blue' | 'yellow' | 'green' | 'neutral' | 'red' {
  switch (status) {
    case 'OPEN':        return 'blue';
    case 'IN_PROGRESS': return 'yellow';
    case 'RESOLVED':    return 'green';
    case 'CLOSED':      return 'neutral';
    case 'REJECTED':    return 'red';
  }
}

export function priorityChipColor(priority: TicketPriority): 'neutral' | 'blue' | 'orange' | 'red' {
  switch (priority) {
    case 'LOW':    return 'neutral';
    case 'MEDIUM': return 'blue';
    case 'HIGH':   return 'orange';
    case 'URGENT': return 'red';
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getManagerDisplayName(user: UserResponse): string {
  if (user.managerProfile?.preferredName) return user.managerProfile.preferredName;
  const first = user.managerProfile?.firstName ?? '';
  const last = user.managerProfile?.lastName ?? '';
  const full = `${first} ${last}`.trim();
  return full || user.email;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isImageAttachment(fileName: string, fileType: string): boolean {
  return fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(fileName);
}

export const SEC_HD_LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

export function splitDateTime(iso: string): [string, string] {
  const full = formatDateTime(iso);
  const lastComma = full.lastIndexOf(',');
  if (lastComma === -1) return [full, ''];
  return [full.slice(0, lastComma), full.slice(lastComma + 1).trim()];
}
