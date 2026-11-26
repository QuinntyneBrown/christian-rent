import { formatRetryAt, formatTime } from './format-retry-at';

// ADR 0019; L2-012 criterion 6; L2-022 criteria 3 and 8. Dates are built in the local time
// zone, as the screen writes them.
describe('formatRetryAt', () => {
  const now = new Date(2026, 5, 8, 15, 0);
  const at = (day: number, hour: number, minute: number) =>
    new Date(2026, 5, day, hour, minute).toISOString();

  it.each([
    [at(8, 15, 40), 'today at 3:40 p.m.'],
    [at(9, 9, 15), 'tomorrow at 9:15 a.m.'],
    [at(10, 9, 15), 'on Jun 10, 2026 at 9:15 a.m.'],
    [null, 'later'],
    ['not a time', 'later'],
  ])('writes %s as "%s"', (retryAt, words) => {
    expect(formatRetryAt(retryAt, now)).toBe(words);
  });

  it('counts tomorrow by the calendar, across the end of a month', () => {
    expect(
      formatRetryAt(new Date(2026, 6, 1, 0, 5).toISOString(), new Date(2026, 5, 30, 23, 0)),
    ).toBe('tomorrow at 12:05 a.m.');
  });
});

describe('formatTime', () => {
  it.each([
    [0, 5, '12:05 a.m.'],
    [9, 15, '9:15 a.m.'],
    [12, 0, '12:00 p.m.'],
    [15, 40, '3:40 p.m.'],
    [23, 59, '11:59 p.m.'],
  ])('writes %i:%i as "%s"', (hour, minute, words) => {
    expect(formatTime(new Date(2026, 5, 8, hour, minute))).toBe(words);
  });
});
