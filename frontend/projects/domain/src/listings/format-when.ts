import type { ListingWhen } from '@rent/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Day {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

/**
 * "When" as a card writes it (L2-022, criteria 3 and 7): words as the member wrote them; one
 * day as "Sat, Aug 8, 2026"; a range with "to" and the year, "Jul 14 to 18, 2026". Null when
 * there is nothing to write.
 */
export function formatWhen(when: ListingWhen): string | null {
  const text = when.text?.trim();
  if (text) {
    return text;
  }
  const start = when.start === null ? null : parse(when.start);
  if (start === null) {
    return null;
  }
  const end = when.end === null ? start : parse(when.end);
  if (end === null || sameDay(start, end)) {
    return `${WEEKDAYS[start.weekday]}, ${MONTHS[start.month]} ${start.day}, ${start.year}`;
  }
  if (start.year !== end.year) {
    return `${MONTHS[start.month]} ${start.day}, ${start.year} to ${MONTHS[end.month]} ${end.day}, ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${MONTHS[start.month]} ${start.day} to ${MONTHS[end.month]} ${end.day}, ${end.year}`;
  }
  return `${MONTHS[start.month]} ${start.day} to ${end.day}, ${end.year}`;
}

/** An ISO date (YYYY-MM-DD) as a calendar day, with no time zone to shift it. */
function parse(iso: string): Day | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  return { year, month, day, weekday };
}

function sameDay(a: Day, b: Day): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
