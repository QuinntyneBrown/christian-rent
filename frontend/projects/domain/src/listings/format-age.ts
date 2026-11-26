const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The spans "Posted …" counts in, largest first, and how long each must have passed (ADR 0016). */
const SPANS: readonly (readonly [unit: string, ms: number, from: number])[] = [
  ['year', 365 * DAY, 365 * DAY],
  ['month', 30 * DAY, 30 * DAY],
  ['week', 7 * DAY, 7 * DAY],
  ['day', DAY, DAY],
  ['hour', HOUR, HOUR],
  ['minute', MINUTE, MINUTE],
];

/**
 * How long ago a listing was posted, "Posted 2 days ago" (L2-007, criterion 6): "just now" under
 * a minute, then minutes, hours, days, weeks, months and years, rounded down (ADR 0016). `now`
 * is passed in, so the rule needs no clock.
 */
export function formatAge(postedAt: string, now: Date): string {
  const elapsed = now.getTime() - new Date(postedAt).getTime();
  for (const [unit, ms, from] of SPANS) {
    if (elapsed >= from) {
      const count = Math.floor(elapsed / ms);
      return `Posted ${count} ${unit}${count === 1 ? '' : 's'} ago`;
    }
  }
  return 'Posted just now';
}
