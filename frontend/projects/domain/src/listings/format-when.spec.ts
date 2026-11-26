import { formatWhen } from './format-when';

// L2-022 criteria 3 and 7: the month as a word, ranges with "to" and the year; one case per row.
describe('formatWhen', () => {
  it.each([
    [
      'words as written',
      { text: 'Tuesdays and Thursdays', start: null, end: null },
      'Tuesdays and Thursdays',
    ],
    [
      'one day with its weekday',
      { text: null, start: '2026-08-08', end: '2026-08-08' },
      'Sat, Aug 8, 2026',
    ],
    [
      'one day given as a start only',
      { text: null, start: '2026-06-08', end: null },
      'Mon, Jun 8, 2026',
    ],
    [
      'days in one month',
      { text: null, start: '2026-07-14', end: '2026-07-18' },
      'Jul 14 to 18, 2026',
    ],
    [
      'days across months',
      { text: null, start: '2026-07-30', end: '2026-08-02' },
      'Jul 30 to Aug 2, 2026',
    ],
    [
      'days across years',
      { text: null, start: '2026-12-30', end: '2027-01-02' },
      'Dec 30, 2026 to Jan 2, 2027',
    ],
  ])('writes %s', (_case, when, expected) => {
    expect(formatWhen(when)).toBe(expected);
  });

  it('writes nothing when there is nothing to write', () => {
    expect(formatWhen({ text: null, start: null, end: null })).toBeNull();
    expect(formatWhen({ text: '   ', start: null, end: null })).toBeNull();
  });
});
