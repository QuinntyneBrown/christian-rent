import { formatAge } from './format-age';

const NOW = new Date('2026-06-10T15:00:00Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function before(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

// L2-007 criterion 6; ADR 0015: "Posted 2 days ago", rounded down. One case per row.
describe('formatAge', () => {
  it.each([
    ['under a minute', 30_000, 'Posted just now'],
    ['a moment in the future, as clocks differ', -5 * MINUTE, 'Posted just now'],
    ['one minute', MINUTE, 'Posted 1 minute ago'],
    ['minutes', 59 * MINUTE, 'Posted 59 minutes ago'],
    ['one hour', HOUR, 'Posted 1 hour ago'],
    ['hours', 6 * HOUR + 59 * MINUTE, 'Posted 6 hours ago'],
    ['one day', DAY + HOUR, 'Posted 1 day ago'],
    ['days', 2 * DAY + HOUR, 'Posted 2 days ago'],
    ['six days', 6 * DAY + 23 * HOUR, 'Posted 6 days ago'],
    ['one week', 7 * DAY, 'Posted 1 week ago'],
    ['weeks', 29 * DAY, 'Posted 4 weeks ago'],
    ['one month', 30 * DAY, 'Posted 1 month ago'],
    ['months', 364 * DAY, 'Posted 12 months ago'],
    ['one year', 365 * DAY, 'Posted 1 year ago'],
    ['years', 3 * 365 * DAY, 'Posted 3 years ago'],
  ])('writes %s', (_case, ms, expected) => {
    expect(formatAge(before(ms), NOW)).toBe(expected);
  });
});
