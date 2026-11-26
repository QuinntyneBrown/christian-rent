import { formatDistance, formatPlace } from './format-place';

// L2-022 criterion 2; L2-001 criterion 9; ADR 0012.
describe('formatDistance', () => {
  it.each([
    [3, '3 km'],
    [0, '0 km'],
    [18.4, '18 km'],
    [1250, '1,250 km'],
  ])('writes %d as "%s"', (km, expected) => {
    expect(formatDistance(km)).toBe(expected);
  });
});

describe('formatPlace', () => {
  it('follows the area with its distance', () => {
    expect(formatPlace('Langley', 3)).toBe('Langley · 3 km');
  });

  it('shows the area alone while the distance is unknown', () => {
    expect(formatPlace('Walnut Grove, Langley', null)).toBe('Walnut Grove, Langley');
  });
});
