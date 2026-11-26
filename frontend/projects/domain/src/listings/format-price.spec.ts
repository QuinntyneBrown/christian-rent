import { formatPrice } from './format-price';

// L2-022 criteria 1 and 6; L2-010 criteria 2 and 14: one case per row.
describe('formatPrice', () => {
  it.each([
    ['a whole amount', 45, 'hour', 'for-rent', '$45', '/ hour'],
    ['cents when they are not zero', 12.5, 'day', 'for-rent', '$12.50', '/ day'],
    ['no cents when they are zero', 850.0, 'month', 'for-rent', '$850', '/ month'],
    ['a thousands separator', 1250.5, 'week', 'for-rent', '$1,250.50', '/ week'],
    ['the largest price', 100000, 'month', 'for-rent', '$100,000', '/ month'],
    ['"Up to" when wanted', 120, 'day', 'wanted', 'Up to $120', '/ day'],
  ] as const)('writes %s', (_case, amount, period, offer, expectedAmount, expectedPer) => {
    expect(formatPrice({ amount, period }, offer)).toEqual({
      amount: expectedAmount,
      per: expectedPer,
    });
  });

  it('writes a price of 0 as "Free", with no period', () => {
    expect(formatPrice({ amount: 0, period: 'day' }, 'for-rent')).toEqual({
      amount: 'Free',
      per: null,
    });
  });

  it('writes nothing for a wanted listing that gave no price', () => {
    expect(formatPrice(null, 'wanted')).toBeNull();
  });
});
