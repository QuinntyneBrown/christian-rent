import type { ListingOffer, ListingPrice } from '@rent/api';

const WHOLE = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const WITH_CENTS = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * A price as a card writes it (L2-022, criteria 1 and 6): "$45" and "/ hour", cents only when
 * they are not zero, a thousands separator, "Up to" for a wanted listing (L2-010, criterion 14)
 * and "Free" for 0 (criterion 2). Null when a wanted listing gives no price.
 */
export function formatPrice(
  price: ListingPrice | null,
  offer: ListingOffer,
): { amount: string; per: string | null } | null {
  if (price === null) {
    return null;
  }
  if (price.amount === 0) {
    return { amount: 'Free', per: null };
  }
  const cents = Math.round(price.amount * 100) % 100 !== 0;
  const dollars = (cents ? WITH_CENTS : WHOLE).format(price.amount);
  return {
    amount: offer === 'wanted' ? `Up to ${dollars}` : dollars,
    per: `/ ${price.period}`,
  };
}
