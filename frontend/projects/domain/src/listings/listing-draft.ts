import type { ListingKind, ListingOffer, PricePeriod } from '@rent/api';

/** Whether "when" is given in words or as a start and an end date (L2-010, criterion 10). */
export type WhenMode = 'text' | 'dates';

/**
 * A listing being written on Post, held in the browser until it is published
 * (compose-listing design). Every field is kept as typed, so switching the offer, the kind or
 * the way "when" is given loses nothing; the price is the text typed, read when it is checked
 * and sent. The dates are ISO dates (YYYY-MM-DD) or empty. `clientRequestId` is made once per
 * draft, so a repeated submission is the same listing (L2-012, criterion 4).
 */
export interface ListingDraft {
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly price: string;
  readonly pricePeriod: PricePeriod;
  readonly whenMode: WhenMode;
  readonly whenText: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly area: string;
  readonly note: string;
  readonly photoIds: readonly string[];
  readonly clientRequestId: string;
}

/** The limits of a listing's fields (L2-010), as the backend counts them. */
export const DRAFT_LIMITS = { title: 80, whenText: 80, area: 80, note: 1000 } as const;

/** A new draft: a thing, for rent unless asked, per day, "when" in words (L2-009, criterion 6). */
export function newDraft(clientRequestId: string, offer: ListingOffer = 'for-rent'): ListingDraft {
  return {
    offer,
    kind: 'thing',
    title: '',
    price: '',
    pricePeriod: 'day',
    whenMode: 'text',
    whenText: '',
    startDate: '',
    endDate: '',
    area: '',
    note: '',
    photoIds: [],
    clientRequestId,
  };
}

/**
 * The draft as another offer: a wanted listing has no photos; every other field is kept
 * (L2-009, criterion 1).
 */
export function withOffer(draft: ListingDraft, offer: ListingOffer): ListingDraft {
  return { ...draft, offer, photoIds: offer === 'wanted' ? [] : draft.photoIds };
}

/**
 * The draft as Browse's address asks for it (L2-004, criterion 2; L2-005): `offer` when it is
 * a known word, and `title` when given; anything else keeps the draft as it is (ADR 0019).
 */
export function arriveWith(
  draft: ListingDraft,
  offer: string | null | undefined,
  title: string | null | undefined,
): ListingDraft {
  let next = draft;
  if (offer === 'for-rent' || offer === 'wanted') {
    next = withOffer(next, offer);
  }
  if (title) {
    next = { ...next, title: title.slice(0, DRAFT_LIMITS.title) };
  }
  return next;
}
