const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When a limit lifts, in words, in the browser's time zone (ADR 0019): "today at 3:40 p.m.",
 * "tomorrow at 9:15 a.m.", or "on Jun 10, 2026 at 9:15 a.m." further away; "later" when the time
 * is not known.
 */
export function formatRetryAt(retryAt: string | null, now: Date): string {
  const at = retryAt === null ? Number.NaN : Date.parse(retryAt);
  if (Number.isNaN(at)) {
    return 'later';
  }
  const when = new Date(at);
  const days = Math.round((startOfDay(when) - startOfDay(now)) / DAY_MS);
  const time = formatTime(when);
  if (days === 0) {
    return `today at ${time}`;
  }
  if (days === 1) {
    return `tomorrow at ${time}`;
  }
  return `on ${MONTHS[when.getMonth()]} ${when.getDate()}, ${when.getFullYear()} at ${time}`;
}

/** A time of day in 12-hour form with "a.m." or "p.m." (L2-022, criterion 8). */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'a.m.' : 'p.m.'}`;
}

/** Local midnight, so that "tomorrow" follows the calendar, not 24 hours. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
