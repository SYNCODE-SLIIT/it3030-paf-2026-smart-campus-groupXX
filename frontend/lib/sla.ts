import type { TicketPriority, TicketStatus } from './api-types';

export const SLA_TTFR_MINUTES: Record<TicketPriority, number> = {
  URGENT: 2 * 60,
  HIGH: 4 * 60,
  MEDIUM: 8 * 60,
  LOW: 24 * 60,
};

export const SLA_TTR_MINUTES: Record<TicketPriority, number> = {
  URGENT: 24 * 60,
  HIGH: 48 * 60,
  MEDIUM: 5 * 24 * 60,
  LOW: 7 * 24 * 60,
};

export type SlaBadge = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

export function computeSlaBadge(ticket: {
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
}): SlaBadge | null {
  if (ticket.status !== 'OPEN' && ticket.status !== 'IN_PROGRESS') return null;

  const elapsedMinutes = (Date.now() - new Date(ticket.createdAt).getTime()) / 60_000;
  const targetMinutes =
    ticket.status === 'OPEN' ? SLA_TTFR_MINUTES[ticket.priority] : SLA_TTR_MINUTES[ticket.priority];

  if (elapsedMinutes >= targetMinutes) return 'BREACHED';
  if (elapsedMinutes >= targetMinutes * 0.75) return 'AT_RISK';
  return 'ON_TRACK';
}

export function formatSlaMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)}d`;
}
