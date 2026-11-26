import { formatCount } from './format-count';

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
