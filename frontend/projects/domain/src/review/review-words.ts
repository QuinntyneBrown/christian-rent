import { formatTime } from '../listings/format-retry-at';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long an item has waited, as its row writes it (L2-019, criterion 14): "just now" under a
 * minute, then "12 min", "3 hr", "1 day" and "2 days", rounded down. `now` is passed in, so the
 * rule needs no clock.
 */
export function formatWaiting(since: string, now: Date): string {
  const waited = now.getTime() - new Date(since).getTime();
  if (waited >= DAY) {
    const days = Math.floor(waited / DAY);
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (waited >= HOUR) {
    return `${Math.floor(waited / HOUR)} hr`;
  }
  return waited >= MINUTE ? `${Math.floor(waited / MINUTE)} min` : 'just now';
}

/** A day an instant falls on in the browser's time zone: "Jun 6, 2026". */
export function formatInstantDay(instant: string): string {
  const at = new Date(instant);
  return `${MONTHS[at.getMonth()]} ${at.getDate()}, ${at.getFullYear()}`;
}

/** A day and its time in the browser's time zone: "Jun 8, 2026, 9:12 a.m." */
export function formatInstant(instant: string): string {
  return `${formatInstantDay(instant)}, ${formatTime(new Date(instant))}`;
}

/** The month an instant falls in, in the browser's time zone: "Apr 2025". */
export function formatMonth(instant: string): string {
  const at = new Date(instant);
  return `${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
}
