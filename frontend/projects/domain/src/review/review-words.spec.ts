import { formatInstant, formatInstantDay, formatMonth, formatWaiting } from './review-words';

const NOW = new Date('2026-06-08T19:00:00Z');
const before = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// L2-019 criterion 14: one case per row.
describe('formatWaiting', () => {
  it.each([
    [0, 'just now'],
    [MINUTE - 1, 'just now'],
    // A clock a little behind the server's.
    [-MINUTE, 'just now'],
    [MINUTE, '1 min'],
    [HOUR - 1, '59 min'],
    [HOUR, '1 hr'],
    [DAY - 1, '23 hr'],
    [DAY, '1 day'],
    [2 * DAY - 1, '1 day'],
    [2 * DAY, '2 days'],
    [40 * DAY, '40 days'],
  ])('writes a wait of %d ms as "%s"', (waited, words) => {
    expect(formatWaiting(before(waited), NOW)).toBe(words);
  });
});

// The dates of a detail, in the browser's time zone, written from local parts so that any zone
// the tests run in agrees.
describe('the dates of a detail', () => {
  const instant = (hour: number, minute: number) =>
    new Date(2026, 5, 8, hour, minute).toISOString();

  it.each([
    [0, 5, 'Jun 8, 2026, 12:05 a.m.'],
    [9, 12, 'Jun 8, 2026, 9:12 a.m.'],
    [12, 1, 'Jun 8, 2026, 12:01 p.m.'],
    [23, 59, 'Jun 8, 2026, 11:59 p.m.'],
  ])('writes %d:%d as a day and a time', (hour, minute, words) => {
    expect(formatInstant(instant(hour, minute))).toBe(words);
  });

  it('writes a day alone, and a month alone', () => {
    expect(formatInstantDay(instant(9, 0))).toBe('Jun 8, 2026');
    expect(formatMonth(instant(9, 0))).toBe('Jun 2026');
  });
});
