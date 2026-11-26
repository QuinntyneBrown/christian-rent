/** Whether a listing offers something or asks for it. */
export type ListingOffer = 'for-rent' | 'wanted';

/** Whether a listing is for a space or a thing. */
export type ListingKind = 'space' | 'thing';

export type PricePeriod = 'hour' | 'day' | 'week' | 'month';

/** Canadian dollars per period (L2-010). Zero is "Free". */
export interface ListingPrice {
  readonly amount: number;
  readonly period: PricePeriod;
}

/** "When" in words, or a start and an end date as ISO dates (YYYY-MM-DD). */
export interface ListingWhen {
  readonly text: string | null;
  readonly start: string | null;
  readonly end: string | null;
}

/** A rendition of a photo, its size, and its text alternative when it has one (ADR 0011). */
export interface ListingPhotoRef {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly description: string | null;
}

/** One listing as a card on Browse, as `GET /api/listings` answers it (browse-listings design). */
export interface ListingCard {
  readonly id: string;
  readonly offer: ListingOffer;
  readonly kind: ListingKind;
  readonly title: string;
  readonly price: ListingPrice | null;
  readonly area: string;
  /** Null until a person's area is designed (ADR 0012). */
  readonly distanceKm: number | null;
  readonly when: ListingWhen;
  readonly posterName: string;
  readonly churchName: string;
  readonly photo: ListingPhotoRef | null;
}

/** How many approved listings there are of each offer. */
export interface ListingCounts {
  readonly everything: number;
  readonly forRent: number;
  readonly wanted: number;
}

/** At most one page of cards, and the cursor of the next page, or null after the last. */
export interface ListingsPage {
  readonly items: readonly ListingCard[];
  readonly nextCursor: string | null;
  readonly counts: ListingCounts;
}
