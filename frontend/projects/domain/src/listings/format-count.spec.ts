import { formatCount, formatCounter } from './format-count';

// docs/design-system/components/segmented.html: counts use thousands separators.
describe('formatCount', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1204, '1,204'],
    [10000, '10,000'],
  ])('writes %d as %s', (count, text) => {
    expect(formatCount(count)).toBe(text);
  });
});

describe('formatCounter', () => {
  it.each([
    [0, 1000, '0 / 1,000'],
    [55, 1000, '55 / 1,000'],
    [1000, 1000, '1,000 / 1,000'],
  ])('writes %i of %i as "%s"', (used, limit, text) => {
    expect(formatCounter(used, limit)).toBe(text);
  });
});
